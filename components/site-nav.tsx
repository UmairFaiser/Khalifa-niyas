"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteNav() {
  const pathname = usePathname() ?? "/";

  return (
    <header className="relative z-10 px-4 pt-5 pb-1 sm:pb-0">
      <nav className="max-w-6xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-2.5 -ml-1 px-1 py-1.5 rounded-xl hover:bg-gray-100/60 transition-colors"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: "var(--color-gray-1200)",
              color: "white",
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <svg
              style={{ width: "18px", height: "18px" }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-[13px] sm:text-sm font-semibold text-gray-1200 truncate">
              ICT with Khalifa Niyas
            </p>
            <p className="text-[11px] sm:text-xs text-gray-1000 truncate">
              Student Worksheet Tracking
            </p>
          </div>
        </Link>

        <div
          className="flex items-center gap-1.5 p-1 rounded-2xl"
          style={{
            backgroundColor: "var(--color-gray-100)",
            opacity: 0.92,
            boxShadow: "inset var(--shadow-border)",
          }}
        >
          <NavChip href="/" exact active={pathname === "/"}>
            Register
          </NavChip>
          <NavChip href="/students" exact active={pathname === "/students"}>
            Students
          </NavChip>
        </div>
      </nav>
    </header>
  );
}

function NavChip({
  href,
  exact,
  active,
  children,
}: {
  href: string;
  exact: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative inline-flex items-center h-9 px-3.5 rounded-xl text-sm font-semibold duration-150 active:scale-[0.96] transition-transform ${
        active ? "text-white" : "text-gray-1100 hover:text-gray-1200"
      }`}
      style={{
        backgroundColor: active ? "var(--color-gray-1200)" : "transparent",
        boxShadow: active
          ? "0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.08)"
          : undefined,
      }}
    >
      {children}
    </Link>
  );
}
