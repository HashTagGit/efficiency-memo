import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — EfficiencyMemo",
  description: "Sign in to EfficiencyMemo with your email.",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
