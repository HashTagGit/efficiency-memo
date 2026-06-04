"use client";

import React, { useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase environment variables are not configured.");
  }
  return createClient(url, key);
}

function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <svg
      role="status"
      aria-label="loading"
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const validateEmail = useCallback((value: string): string | null => {
    if (!value.trim()) return "Email is required";
    if (!EMAIL_REGEX.test(value.trim())) return "Please enter a valid email address";
    return null;
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const validationError = validateEmail(email);
      if (validationError) {
        setStatus("error");
        setErrorMessage(validationError);
        return;
      }

      setStatus("loading");
      setErrorMessage("");

      try {
        const supabase = getSupabaseClient();
        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : "/auth/callback";

        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: redirectTo },
        });

        if (error) {
          setStatus("error");
          setErrorMessage(error.message || "Failed to send magic link. Please try again.");
        } else {
          setStatus("success");
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "An unexpected error occurred."
        );
      }
    },
    [email, validateEmail]
  );

  if (status === "success") {
    return (
      <div
        data-testid="sign-in-success"
        className="rounded-lg border border-success/30 bg-success/10 p-6 text-center"
      >
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
          <svg
            className="h-5 w-5 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-base font-medium text-foreground">Check your email</h2>
        <p className="mt-1 text-sm text-muted">
          We sent a magic link to{" "}
          <span className="font-medium text-foreground">{email}</span>. Click it to sign
          in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground"
        >
          Email address
        </label>
        <input
          id="email"
          data-testid="email-input"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") {
              setStatus("idle");
              setErrorMessage("");
            }
          }}
          disabled={status === "loading"}
          className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/50 ${
            status === "error" && errorMessage
              ? "border-danger focus:border-danger"
              : "border-border focus:border-accent"
          }`}
        />
        {status === "error" && errorMessage && (
          <p data-testid="sign-in-error" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}
      </div>

      <button
        data-testid="sign-in-submit"
        type="submit"
        disabled={status === "loading"}
        className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-colors duration-200 hover:bg-accent-strong focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            Sending...
          </>
        ) : (
          "Send magic link"
        )}
      </button>
    </form>
  );
}
