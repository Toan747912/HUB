"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Map,
  Award,
  BookOpen,
  TrendingUp,
  LogOut,
  Sparkles,
  X,
} from "lucide-react";
import { useAuthStore } from "@/shared/stores/auth.store";
import { useMobileNavStore } from "@/shared/stores/mobile-nav.store";
import { cn } from "@/shared/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/roadmaps", label: "Roadmaps", icon: Map },
  { href: "/assessments", label: "Assessments", icon: Award },
  { href: "/learning-sessions", label: "Learning Workspace", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: TrendingUp },
];

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  return (
    <>
      {/* Nav items list */}
      <nav aria-label="Main navigation" className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 font-semibold"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white",
              )}
            >
              <item.icon
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 transition-transform group-hover:scale-110",
                  isActive ? "text-white" : "text-zinc-400 group-hover:text-white",
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile & logout bar */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex flex-col space-y-3">
        <div className="flex items-center space-x-3 px-2">
          <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs">
            {user?.username?.slice(0, 2).toUpperCase() ?? "US"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white truncate">
              {user?.username ?? "Learner"}
            </span>
            <span className="text-[10px] text-zinc-500 capitalize truncate">
              {user?.roles?.[0] ?? "Student"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Log out</span>
        </button>
      </div>
    </>
  );
}

function BrandHeader() {
  return (
    <div className="h-16 flex items-center px-6 border-b border-zinc-800">
      <Link
        href="/dashboard"
        className="flex items-center space-x-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
      >
        <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-550 to-violet-600 bg-indigo-600 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <span className="font-bold text-white tracking-wider text-base">MEMENTO OS</span>
      </Link>
    </div>
  );
}

/** Slide-in navigation drawer for viewports below the `lg` breakpoint. */
function MobileNavDrawer() {
  const isOpen = useMobileNavStore((state) => state.isOpen);
  const close = useMobileNavStore((state) => state.close);
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Depends on `mounted` too — see the equivalent comment in ui/dialog.tsx.
  React.useEffect(() => {
    if (!isOpen || !mounted) return;

    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;
    const node = panelRef.current;
    const firstFocusable = node?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? node)?.focus();

    return () => {
      previouslyFocusedElement.current?.focus?.();
    };
  }, [isOpen, mounted]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }

    if (event.key !== "Tab") return;

    const node = panelRef.current;
    if (!node) return;

    const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="relative z-50 h-full w-72 max-w-[85vw] bg-zinc-950 border-r border-zinc-800 flex flex-col focus:outline-none slide-in-left"
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800">
          <Link href="/dashboard" onClick={close} className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-indigo-550 to-violet-600 bg-indigo-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-white tracking-wider text-base">MEMENTO OS</span>
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label="Close navigation menu"
            className="h-9 w-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <SidebarContent onNavigate={close} />
      </div>
    </div>,
    document.body,
  );
}

export function Sidebar() {
  return (
    <>
      {/* Desktop / tablet fixed sidebar */}
      <aside
        aria-label="Sidebar"
        className="hidden lg:flex w-64 border-r border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex-col h-screen fixed left-0 top-0 z-40"
      >
        <BrandHeader />
        <SidebarContent />
      </aside>

      {/* Mobile / tablet drawer, toggled from the header hamburger button */}
      <MobileNavDrawer />
    </>
  );
}
