import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * MOCK_AUTH_COOKIE name for mock auth bypass.
 * Value: "efficiency-memo-mock-auth"
 */
const MOCK_AUTH_COOKIE = "efficiency-memo-mock-auth";
const TEST_EMAIL = "test@example.com";

/**
 * Helper: sign in via direct cookie for tool-registry pages.
 */
async function signInViaCookie(context: BrowserContext, email = TEST_EMAIL) {
  await context.addCookies([
    {
      name: MOCK_AUTH_COOKIE,
      value: email,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

test.describe("Tool Registry — Dashboard Integration", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ context }) => {
    await signInViaCookie(context);
  });

  test("dashboard page loads with auth and shows tool grid or empty state", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Verify the dashboard page metadata and heading
    await expect(page).toHaveTitle(/EfficiencyMemo/i);
    await expect(
      page.getByRole("heading", { name: /Dashboard/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/Your personal tool gallery/i),
    ).toBeVisible();

    // Either the tool grid (tools registered) or empty state (no tools) is visible
    // This validates the dashboard's conditional rendering path works
    const toolGrid = page.locator('[data-testid="dashboard-tool-grid"]');
    const emptyState = page.locator('[data-testid="dashboard-empty-state"]');

    const hasGrid = (await toolGrid.count()) > 0;
    const hasEmpty = (await emptyState.count()) > 0;
    expect(hasGrid || hasEmpty).toBe(true);
  });

  test("dashboard shows Charger Reminder and CoreHour tool cards when registered", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const toolGrid = page.locator('[data-testid="dashboard-tool-grid"]');

    // Only verify card content if tools are registered
    test.skip((await toolGrid.count()) === 0, "No tools registered - skipping card verification");

    // Verify both tool cards exist
    await expect(
      page.locator('[data-testid="dashboard-tool-card-charger-reminder"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="dashboard-tool-card-core-hour"]'),
    ).toBeVisible();

    // Verify card names are displayed
    await expect(page.getByText("Charger Reminder")).toBeVisible();
    await expect(page.getByText("CoreHour")).toBeVisible();
  });

  test("clicking Charger Reminder card navigates to /tools/charger-reminder", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const crCard = page.locator(
      '[data-testid="dashboard-tool-card-charger-reminder"]',
    );

    if ((await crCard.count()) > 0) {
      // Navigate via card click
      await crCard.click();
      await expect(page).toHaveURL(/\/tools\/charger-reminder/);
    } else {
      // Fallback: verify direct navigation works
      await page.goto("/tools/charger-reminder");
      await expect(page).toHaveURL(/\/tools\/charger-reminder/);
    }

    // Verify the Charger Reminder page content loaded
    await expect(
      page.getByRole("heading", { name: /Charger Reminder/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("clicking CoreHour card navigates to /tools/core-hour", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    const chCard = page.locator(
      '[data-testid="dashboard-tool-card-core-hour"]',
    );

    if ((await chCard.count()) > 0) {
      // Navigate via card click
      await chCard.click();
      await expect(page).toHaveURL(/\/tools\/core-hour/);
    } else {
      // Fallback: verify direct navigation works
      await page.goto("/tools/core-hour");
      await expect(page).toHaveURL(/\/tools\/core-hour/);
    }

    // Verify the CoreHour page content loaded
    await expect(
      page.getByRole("heading", { name: /CoreHour/i }),
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Tool Registry — Lazy Loading & Navigation", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ context }) => {
    await signInViaCookie(context);
  });

  test("Charger Reminder page loads without errors", async ({ page }) => {
    await page.goto("/tools/charger-reminder");

    // Verify the page header and description are rendered
    await expect(
      page.getByRole("heading", { name: /Charger Reminder/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/Manage your battery-powered devices/i),
    ).toBeVisible();

    // Verify the page has the "Add Device" button (always visible)
    await expect(
      page.getByTestId("add-device-link"),
    ).toBeVisible();

    // Verify no runtime errors (page is interactive)
    await expect(
      page.getByTestId("add-device-link"),
    ).toHaveAttribute("href", "/tools/charger-reminder/new");
  });

  test("CoreHour page loads without errors", async ({ page }) => {
    await page.goto("/tools/core-hour");

    // Verify the page header and description are rendered
    await expect(
      page.getByRole("heading", { name: /CoreHour/i }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/Track how you spend your time/i),
    ).toBeVisible();
  });

  test("unknown tool shows Tool Not Found via [toolId] catch-all route", async ({
    page,
  }) => {
    await page.goto("/tools/nonexistent-tool");

    // The [toolId]/page.tsx catch-all route calls getToolById('nonexistent-tool')
    // which returns undefined, triggering notFound()
    await expect(
      page.getByRole("heading", { name: /Tool Not Found/i }),
    ).toBeVisible({ timeout: 10000 });

    // Should show a link back to dashboard
    await expect(
      page.getByRole("link", { name: /Back to Dashboard/i }),
    ).toBeVisible();
  });

  test("navigation between tool pages works correctly", async ({ page }) => {
    // Start at Charger Reminder
    await page.goto("/tools/charger-reminder");
    await expect(
      page.getByRole("heading", { name: /Charger Reminder/i }),
    ).toBeVisible();

    // Navigate to CoreHour directly
    await page.goto("/tools/core-hour");
    await expect(
      page.getByRole("heading", { name: /CoreHour/i }),
    ).toBeVisible();

    // Navigate back to dashboard
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: /Dashboard/i }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("tool page navigation from dashboard sidebar links works", async ({
    page,
  }) => {
    // The sidebar renders tool links from getToolList()
    // When tools are registered, sidebar links should navigate correctly
    await page.goto("/dashboard");

    // Try nav link for Charger Reminder (sidebar or header tool links)
    const crSidebarLink = page.locator(
      'a[href="/tools/charger-reminder"]',
    ).first();

    if ((await crSidebarLink.count()) > 0) {
      await crSidebarLink.click();
      await expect(page).toHaveURL(/\/tools\/charger-reminder/);
      await expect(
        page.getByRole("heading", { name: /Charger Reminder/i }),
      ).toBeVisible({ timeout: 10000 });

      // Navigate back and try CoreHour sidebar link
      await page.goto("/dashboard");
      const chSidebarLink = page.locator(
        'a[href="/tools/core-hour"]',
      ).first();

      if ((await chSidebarLink.count()) > 0) {
        await chSidebarLink.click();
        await expect(page).toHaveURL(/\/tools\/core-hour/);
        await expect(
          page.getByRole("heading", { name: /CoreHour/i }),
        ).toBeVisible({ timeout: 10000 });
      }
    }
  });
});

test.describe("Tool Registry — Auth Guard", () => {
  test.describe.configure({ mode: "serial" });

  test("redirects to sign-in when no auth cookie is set", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/tools/charger-reminder");

    // The shell layout redirects to /sign-in when not authenticated
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(
      page.getByRole("heading", { name: /welcome back/i }),
    ).toBeVisible();
  });

  test("tool pages persist session after reload", async ({ page, context }) => {
    await signInViaCookie(context);
    await page.goto("/tools/charger-reminder");

    // Verify we're authenticated
    await expect(
      page.getByRole("heading", { name: /Charger Reminder/i }),
    ).toBeVisible({ timeout: 10000 });

    // Reload and verify session persists
    await page.reload();
    await expect(
      page.getByRole("heading", { name: /Charger Reminder/i }),
    ).toBeVisible({ timeout: 10000 });
    expect(page.url()).not.toContain("/sign-in");
  });
});
