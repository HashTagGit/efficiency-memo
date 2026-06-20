import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@memo/ui";
import { signIn } from "../../lib/auth";

export function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await signIn(email.trim());
      navigate("/dashboard");
    } catch (err) {
      console.error("Sign in failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Sign In</h1>
          <p className="mt-2 text-muted">Enter your email to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />

          <Button
            variant="primary"
            size="lg"
            isLoading={isLoading}
            data-testid="sign-in-button"
          >
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
