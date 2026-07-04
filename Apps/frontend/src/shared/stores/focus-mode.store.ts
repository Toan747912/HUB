import { create } from "zustand";
import { trackWorkspaceEvent } from "@/app/(authenticated)/learning-sessions/lib/telemetry";

interface FocusModeStore {
  isFocusMode: boolean;
  enter: () => void;
  exit: () => void;
  toggle: () => void;
}

export const useFocusModeStore = create<FocusModeStore>((set, get) => ({
  isFocusMode: false,
  enter: () => {
    if (!get().isFocusMode) {
      trackWorkspaceEvent("focus_mode_entered");
    }
    set({ isFocusMode: true });
  },
  exit: () => {
    if (get().isFocusMode) {
      trackWorkspaceEvent("focus_mode_exited");
    }
    set({ isFocusMode: false });
  },
  toggle: () => {
    const next = !get().isFocusMode;
    trackWorkspaceEvent(next ? "focus_mode_entered" : "focus_mode_exited");
    set({ isFocusMode: next });
  },
}));
