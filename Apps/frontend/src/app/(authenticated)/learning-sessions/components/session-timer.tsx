"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import {
  deriveElapsedSeconds,
  formatElapsed,
  type SessionTimerLike,
} from "../hooks/use-session-timer";

interface SessionTimerProps {
  timer: SessionTimerLike | null | undefined;
  status: string;
}

/**
 * The only component in the workspace allowed to re-render every second -- it owns its own
 * local tick state so the rest of the page tree (notes, checklist, etc.) never re-renders
 * on the timer's account.
 */
export function SessionTimer({ timer, status }: SessionTimerProps) {
  const [elapsed, setElapsed] = React.useState(() => deriveElapsedSeconds(timer, status));

  React.useEffect(() => {
    setElapsed(deriveElapsedSeconds(timer, status));

    if (status !== "ACTIVE" || !timer || timer.pausedAt) {
      return;
    }

    const interval = setInterval(() => {
      setElapsed(deriveElapsedSeconds(timer, status));
    }, 1000);

    return () => clearInterval(interval);
  }, [timer, status]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/40 rounded-lg border border-zinc-800">
      <Clock className="h-8 w-8 text-zinc-500 mb-2" aria-hidden="true" />
      <span
        className="text-6xl font-extrabold text-white tracking-widest font-mono tabular-nums"
        role="timer"
        aria-live="off"
        aria-label={`Elapsed study time ${formatElapsed(elapsed)}`}
      >
        {formatElapsed(elapsed)}
      </span>
      <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-2">
        Elapsed Time
      </span>
    </div>
  );
}
