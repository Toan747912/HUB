"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFocusModeStore } from "@/shared/stores/focus-mode.store";

export function FocusModeToggle() {
  const isFocusMode = useFocusModeStore((state) => state.isFocusMode);
  const toggle = useFocusModeStore((state) => state.toggle);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      className="flex items-center gap-1.5"
    >
      {isFocusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      {isFocusMode ? "Exit Focus Mode" : "Focus Mode"}
    </Button>
  );
}
