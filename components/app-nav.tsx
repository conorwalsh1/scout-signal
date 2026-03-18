"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  );
}

function IconBookmark({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function IconCreditCard({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function IconLogOut({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function IconTag({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20.59 13.41 11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard },
  { href: "/companies", label: "Companies", icon: IconBuilding },
  { href: "/saved", label: "Tracked Companies", icon: IconBookmark },
  { href: "/alerts", label: "Alerts", icon: IconBell },
  { href: "/account", label: "Account", icon: IconCreditCard },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium no-underline-hover border-l-2 ${
                isActive
                  ? "bg-[rgba(34,197,94,0.08)] text-foreground border-signal-green"
                  : "border-transparent text-secondary hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden group-hover/sidebar:inline group-focus-within/sidebar:inline group-data-[pinned=true]/sidebar:inline">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 space-y-1 border-t border-sidebar-border p-2">
        <Link
          href="/pricing"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-secondary hover:bg-muted hover:text-foreground border-l-2 border-transparent no-underline-hover"
          title="Pricing"
        >
          <IconTag className="h-4 w-4 shrink-0" />
          <span className="hidden group-hover/sidebar:inline group-focus-within/sidebar:inline group-data-[pinned=true]/sidebar:inline">
            Pricing
          </span>
        </Link>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            title="Log out"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-secondary hover:bg-muted hover:text-foreground w-full text-left border-l-2 border-transparent"
          >
            <IconLogOut className="h-4 w-4 shrink-0" />
            <span className="hidden group-hover/sidebar:inline group-focus-within/sidebar:inline group-data-[pinned=true]/sidebar:inline">
              Log out
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
