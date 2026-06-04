import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignInForm } from "../sign-in-form";

const mockSignInWithOtp = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
    },
  })),
}));

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders email input and submit button", () => {
    render(<SignInForm />);

    expect(screen.getByTestId("email-input")).toBeInTheDocument();
    expect(screen.getByTestId("sign-in-submit")).toBeInTheDocument();
    expect(screen.getByTestId("sign-in-submit")).toHaveTextContent("Send magic link");
  });

  it("shows validation error for empty email", async () => {
    render(<SignInForm />);

    const submitButton = screen.getByTestId("sign-in-submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("sign-in-error")).toHaveTextContent("Email is required");
    });
  });

  it("shows validation error for invalid email format", async () => {
    render(<SignInForm />);

    const emailInput = screen.getByTestId("email-input");
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });

    const submitButton = screen.getByTestId("sign-in-submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("sign-in-error")).toHaveTextContent(
        "Please enter a valid email address"
      );
    });
  });

  it("shows loading state while submitting", async () => {
    mockSignInWithOtp.mockImplementation(() => new Promise(() => {}));

    render(<SignInForm />);

    const emailInput = screen.getByTestId("email-input");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByTestId("sign-in-submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("sign-in-submit")).toHaveTextContent("Sending...");
    });

    expect(screen.getByTestId("sign-in-submit")).toBeDisabled();
  });

  it("shows success state after magic link is sent", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });

    render(<SignInForm />);

    const emailInput = screen.getByTestId("email-input");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByTestId("sign-in-submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("sign-in-success")).toBeInTheDocument();
    });

    expect(screen.getByTestId("sign-in-success")).toHaveTextContent("Check your email");
    expect(screen.getByTestId("sign-in-success")).toHaveTextContent("test@example.com");
  });

  it("shows error state when Supabase returns an error", async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { message: "Rate limit exceeded" },
    });

    render(<SignInForm />);

    const emailInput = screen.getByTestId("email-input");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByTestId("sign-in-submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId("sign-in-error")).toHaveTextContent("Rate limit exceeded");
    });
  });

  it("calls signInWithOtp with correct email and redirect URL", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });

    render(<SignInForm />);

    const emailInput = screen.getByTestId("email-input");
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });

    const submitButton = screen.getByTestId("sign-in-submit");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);
    });

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: "test@example.com",
      options: {
        emailRedirectTo: expect.stringContaining("/auth/callback"),
      },
    });
  });
});
