"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/shared/stores/auth.store";

export default function RootIndexPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const loading = useAuthStore((state) => state.loading);
  const initialize = useAuthStore((state) => state.initialize);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  React.useEffect(() => {
    if (!loading) {
      if (accessToken) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [loading, accessToken, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white">
      <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
      <span className="text-sm font-semibold tracking-wide text-zinc-400">
        Bootstrapping system...
      </span>
    </div>
  );
}
