"use client";

import { Bell, Flame, HelpCircle, Menu } from "lucide-react";
import { useAuthStore } from "@/shared/stores/auth.store";
import { useMobileNavStore } from "@/shared/stores/mobile-nav.store";

export function Header() {
  const user = useAuthStore((state) => state.user);
  const openMobileNav = useMobileNavStore((state) => state.open);

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile / tablet nav toggle */}
        <button
          type="button"
          onClick={openMobileNav}
          aria-label="Open navigation menu"
          className="h-10 w-10 shrink-0 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Search / Breadcrumbs placeholder */}
        <h2 className="text-sm font-semibold text-zinc-400 truncate">
          Welcome back, <span className="text-white">{user?.username ?? "Learner"}</span> 👋
        </h2>
      </div>

      {/* Utilities panel */}
      <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
        {/* Learning Streak Widget */}
        <div className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400">
          <Flame className="h-4 w-4 fill-amber-500/20" aria-hidden="true" />
          <span className="text-xs font-bold hidden sm:inline">5 Day Streak</span>
        </div>

        {/* Notifications Icon Button */}
        <button
          type="button"
          aria-label="Notifications (unread)"
          className="h-10 w-10 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all relative focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          <span
            className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-indigo-500"
            aria-hidden="true"
          />
        </button>

        {/* Support Help Button */}
        <button
          type="button"
          aria-label="Help and support"
          className="h-10 w-10 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
