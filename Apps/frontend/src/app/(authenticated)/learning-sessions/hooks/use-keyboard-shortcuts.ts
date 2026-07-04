import * as React from "react";

interface UseKeyboardShortcutsOptions {
  onTogglePause: () => void;
  onSaveNotes: () => void;
  onComplete: () => void;
  onExitFocusMode: () => void;
  onOpenHelp: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useKeyboardShortcuts({
  onTogglePause,
  onSaveNotes,
  onComplete,
  onExitFocusMode,
  onOpenHelp,
}: UseKeyboardShortcutsOptions) {
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onExitFocusMode();
        return;
      }

      if (isEditableTarget(event.target)) {
        const isSave = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
        const isComplete = (event.ctrlKey || event.metaKey) && event.key === "Enter";
        if (isSave) {
          event.preventDefault();
          onSaveNotes();
        } else if (isComplete) {
          event.preventDefault();
          onComplete();
        }
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        onTogglePause();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onSaveNotes();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        onComplete();
        return;
      }

      if (event.key === "?") {
        onOpenHelp();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onTogglePause, onSaveNotes, onComplete, onExitFocusMode, onOpenHelp]);
}
