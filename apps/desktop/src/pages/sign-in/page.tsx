import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@memo/ui";
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
          <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
          <p className="mt-2 text-gray-500">Enter your email to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

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
