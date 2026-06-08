import { APP_NAME } from "@memo/shared";
import { AuthHashHandler } from "@/components/auth/auth-hash-handler";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-12">
      <AuthHashHandler />
      <div className="text-center space-y-4">
        <h1
          className="text-5xl md:text-7xl font-semibold tracking-tight"
          style={{ fontFamily: "var(--font-cormorant), ui-serif, Georgia, serif" }}
        >
          {APP_NAME}
        </h1>
        <p className="text-lg text-muted max-w-md mx-auto" style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}>
          A modern tool gallery for daily productivity
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        <div className="rounded-xl border border-border bg-card p-6 shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-accent mb-2">Design Tokens</h2>
          <p className="text-sm text-muted">
            Custom colors, typography, and spacing configured via Tailwind v4 @theme.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-accent mb-2">Typography</h2>
          <p className="text-sm text-muted">
            Manrope for body text, Cormorant Garamond for display headings.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-accent mb-2">Sidebar</h2>
          <p className="text-sm text-muted">
            Collapsible sidebar with custom width tokens (64px / 240px).
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-accent mb-2">Dark Theme</h2>
          <p className="text-sm text-muted">
            Rich dark palette with warm gold accents and subtle grid overlay.
          </p>
        </div>
      </div>

      <div className="flex gap-4 mt-4">
        <div className="px-4 py-2 rounded-lg bg-success/10 text-success text-sm font-medium">
          Success
        </div>
        <div className="px-4 py-2 rounded-lg bg-danger/10 text-danger text-sm font-medium">
          Danger
        </div>
        <div className="px-4 py-2 rounded-lg bg-info/10 text-info text-sm font-medium">
          Info
        </div>
        <div className="px-4 py-2 rounded-lg bg-warning/10 text-warning text-sm font-medium">
          Warning
        </div>
      </div>
    </main>
  );
}
