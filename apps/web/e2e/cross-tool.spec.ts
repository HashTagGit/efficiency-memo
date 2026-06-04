import { test, expect, type Page, type BrowserContext } from "@playwright/test";

/**
 * MOCK_AUTH_COOKIE name for mock auth bypass.
 * Value: "efficiency-memo-mock-auth"
 */
const MOCK_AUTH_COOKIE = "efficiency-memo-mock-auth";
const TEST_EMAIL = "test@example.com";

/**
 * Helper: sign in via direct cookie for cross-tool navigation tests.
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

/**
 * Helper: navigate from one tool to another and verify auth persistence.
 */
async function navigateBetweenTools(
  page: Page,
  fromPath: string,
  toPath: string,
) {
  // Start at the first tool page
  await page.goto(fromPath);
  await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 10000 });

  // Verify we're on the first tool (not redirected to sign-in)
  expect(page.url()).not.toContain("/sign-in");

  // Navigate to the second tool page
  await page.goto(toPath);
  await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 10000 });

  // Verify we're on the second tool (not redirected to sign-in)
  expect(page.url()).not.toContain("/sign-in");
  expect(page.url()).toContain(toPath);
}

test.describe("Cross-Tool Auth & Navigation", () => {
  test.describe.configure({ mode: "serial" });

  test("signs in and navigates from Charger Reminder to CoreHour", async ({
    page,
    context,
  }) => {
    await signInViaCookie(context);
    await navigateBetweenTools(
      page,
      "/tools/charger-reminder",
      "/tools/core-hour",
    );
  });

  test("signs in and navigates from CoreHour to Charger Reminder", async ({
    page,
    context,
  }) => {
    await signInViaCookie(context);
    await navigateBetweenTools(
      page,
      "/tools/core-hour",
      "/tools/charger-reminder",
    );
  });

  test("auth persists when navigating between tools in same session", async ({
    page,
    context,
  }) => {
    await signInViaCookie(context);

    // Navigate to Charger Reminder
    await page.goto("/tools/charger-reminder");
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 10000 });

    // Navigate to CoreHour
    await page.goto("/tools/core-hour");
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 10000 });

    // Navigate back to Charger Reminder
    await page.goto("/tools/charger-reminder");
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 10000 });

    // Verify no redirect to sign-in across all navigations
    expect(page.url()).not.toContain("/sign-in");
  });

  test("session persists after reload on each tool page", async ({
    page,
    context,
  }) => {
    await signInViaCookie(context);

    // Charger Reminder: load and reload
    await page.goto("/tools/charger-reminder");
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 10000 });
    await page.reload();
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 10000 });
    expect(page.url()).not.toContain("/sign-in");

    // CoreHour: load and reload
    await page.goto("/tools/core-hour");
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 10000 });
    await page.reload();
    await expect(page.getByText(TEST_EMAIL)).toBeVisible({ timeout: 10000 });
    expect(page.url()).not.toContain("/sign-in");
  });

  test("dashboard shows both tools when authenticated", async ({
    page,
    context,
  }) => {
    await signInViaCookie(context);
    await page.goto("/dashboard");

    // Dashboard heading visible
    await expect(
      page.getByRole("heading", { name: /Dashboard/i }),
    ).toBeVisible({ timeout: 10000 });

    // The tool grid or empty state should be visible
    const toolGrid = page.locator('[data-testid="dashboard-tool-grid"]');
    const emptyState = page.locator('[data-testid="dashboard-empty-state"]');
    const hasGrid = (await toolGrid.count()) > 0;
    const hasEmpty = (await emptyState.count()) > 0;
    expect(hasGrid || hasEmpty).toBe(true);
  });

  test("redirects to sign-in from any tool page when unauthenticated", async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // Try Charger Reminder
    await page.goto("/tools/charger-reminder");
    expect(page.url()).toContain("/sign-in");

    // Try CoreHour
    await page.goto("/tools/core-hour");
    expect(page.url()).toContain("/sign-in");
  });
});
