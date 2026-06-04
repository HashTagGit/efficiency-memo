import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <h1 className="text-4xl font-bold text-muted-foreground mb-4">404</h1>
      <h2 className="text-xl font-semibold mb-2">Tool Not Found</h2>
      <p className="text-muted-foreground mb-6">
        The tool you&apos;re looking for doesn&apos;t exist or has been disabled.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}