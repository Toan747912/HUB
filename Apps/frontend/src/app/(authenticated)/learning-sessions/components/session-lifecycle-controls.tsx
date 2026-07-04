"use client";

import { Pause, Play, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionLifecycleControlsProps {
  status: string;
  isPausing: boolean;
  isResuming: boolean;
  onPause: () => void;
  onResume: () => void;
  onRequestComplete: () => void;
}

export function SessionLifecycleControls({
  status,
  isPausing,
  isResuming,
  onPause,
  onResume,
  onRequestComplete,
}: SessionLifecycleControlsProps) {
  const isActive = status === "ACTIVE";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex justify-center gap-4">
        {isActive ? (
          <Button
            onClick={onPause}
            disabled={isPausing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Pause className="h-4 w-4" /> Pause Session
          </Button>
        ) : (
          <Button
            onClick={onResume}
            disabled={isResuming}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4 text-emerald-500 fill-emerald-500/20" /> Resume Session
          </Button>
        )}
        <Button
          onClick={onRequestComplete}
          disabled={!isActive}
          variant="gradient"
          className="flex items-center gap-2"
          title={!isActive ? "Resume the session to complete it" : undefined}
        >
          <StopCircle className="h-4 w-4" /> Complete Session
        </Button>
      </div>
      {!isActive && <p className="text-xs text-zinc-500">Resume the session to complete it.</p>}
    </div>
  );
}
