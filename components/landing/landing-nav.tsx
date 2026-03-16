import Link from "next/link";

export function LandingNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-semibold text-foreground-heading no-underline hover:text-signal-green transition-colors">
          ScoutSignal
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/pricing"
            className="text-sm font-medium text-secondary no-underline hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-secondary no-underline hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-signal-green px-4 py-2 text-sm font-medium text-black no-underline hover:bg-signal-green/90"
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
