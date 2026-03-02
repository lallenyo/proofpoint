"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/accounts", label: "Portfolio" },
  { href: "/tasks", label: "Tasks" },
  { href: "/playbooks", label: "Playbooks" },
  { href: "/emails", label: "Emails" },
  { href: "/tools/generator", label: "Report Generator" },
  { href: "/tools/next-action", label: "Next Action" },
  { href: "/tools/roi-calculator", label: "ROI Calculator" },
  { href: "/tools/cs-roi", label: "CS Program ROI" },
];

export function Nav() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  if (!isSignedIn) return null;

  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(4,7,20,0.9)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid #1e293b",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", height: 56,
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: "#10b981", fontWeight: 700 }}>
          Proofpoint
        </span>
      </Link>

      {/* Nav items */}
      <div style={{ display: "flex", gap: 4 }}>
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} style={{
              textDecoration: "none",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              color: active ? "#10b981" : "#94a3b8",
              background: active ? "rgba(16,185,129,0.1)" : "transparent",
              transition: "all 0.15s",
            }}>
              {label}
            </Link>
          );
        })}
      </div>

      {/* User */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <UserButton afterSignOutUrl="/" />
      </div>
    </nav>
  );
}

// Wrapper to add top padding for fixed nav
export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ paddingTop: 56 }}>
      {children}
    </div>
  );
}
