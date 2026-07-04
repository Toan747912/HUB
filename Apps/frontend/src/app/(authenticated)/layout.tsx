"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/shared/stores/auth.store";
import { useFocusModeStore } from "@/shared/stores/focus-mode.store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const loading = useAuthStore((state) => state.loading);
  const initialize = useAuthStore((state) => state.initialize);
  const isFocusMode = useFocusModeStore((state) => state.isFocusMode);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  React.useEffect(() => {
    if (!loading && !accessToken && !refreshToken) {
      router.push("/login");
    }
  }, [loading, accessToken, refreshToken, router]);

  if (loading || (!accessToken && refreshToken)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wide text-zinc-400">
          Loading your adaptive workspace...
        </span>
      </div>
    );
  }

  if (!accessToken) {
    return null; // prevents flashing while redirecting
  }

  if (isFocusMode) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0">
        {/* Header toolbar */}
        <Header />

        {/* Dynamic page contents */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
