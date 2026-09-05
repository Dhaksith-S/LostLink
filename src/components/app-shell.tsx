"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileStack,
  LayoutList,
  LogOut,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/lib/auth-context";

const PUBLIC_ROUTES = new Set(["/login"]);

/**
 * Auth-aware frame. `/login` renders standalone; every other route requires
 * a signed-in Firebase user and otherwise redirects back to `/login`.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const isPublic = PUBLIC_ROUTES.has(pathname);

  useEffect(() => {
    if (user === undefined) return;
    if (!user && !isPublic) router.replace("/login");
    if (user && isPublic) router.replace("/reports");
  }, [user, isPublic, router]);

  const splash = (message: string) => (
    <div className="auth-splash" role="status" aria-live="polite">
      <BrandMark size={52} />
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
  if (user === undefined) return splash("Checking your session…");
  if (!user) {
    return isPublic ? (
      <div className="auth-layout">{children}</div>
    ) : (
      splash("Redirecting to sign-in…")
    );
  }
  if (isPublic) return splash("Opening reports…");

  const section =
    pathname === "/import"
      ? "Backlog import"
      : pathname.startsWith("/reports/")
        ? "Report detail"
        : "Reports";
  const initials = (user.displayName || user.email || "A")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link
          href="/reports"
          className="brand"
          aria-label="LostLink Admin home"
        >
          <BrandMark size={36} />
          <span className="brand-text">
            LostLink
            <span className="brand-admin">Admin console</span>
          </span>
        </Link>
        <nav className="side-nav" aria-label="Main navigation">
          <Link
            href="/reports"
            aria-current={pathname.startsWith("/reports") ? "page" : undefined}
          >
            <LayoutList size={18} />
            Reports
          </Link>
          <Link
            href="/import"
            aria-current={pathname === "/import" ? "page" : undefined}
          >
            <FileStack size={18} />
            Backlog import
          </Link>
        </nav>
        <div className="sidebar-note">
          <strong>
            A little lost.
            <br />A lot of possibilities.
          </strong>
          <p>Helping campus belongings find their way back.</p>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar" aria-hidden="true">
            {initials || <ShieldCheck size={18} />}
          </span>
          <div className="signed-in">
            <strong>{user.displayName || "Administrator"}</strong>
            <span title={user.email ?? undefined}>{user.email}</span>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => void signOut()}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span className="breadcrumb">
            LostLink Admin <span className="breadcrumb-slash">/</span>{" "}
            <strong>{section}</strong>
          </span>
          <span className="live-pill" title="Real-time Firestore listener">
            <Radio size={13} />
            Live · Firestore
          </span>
        </header>
        <main id="main-content">{children}</main>
        <footer className="page-footer">
          <span>LostLink Admin</span>
          <span>Bringing belongings back together.</span>
        </footer>
      </div>
    </div>
  );
}
