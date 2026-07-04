"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "Space", description: "Pause / Resume the session" },
  { keys: "Ctrl + S", description: "Save notes now" },
  { keys: "Ctrl + Enter", description: "Complete the current activity / session" },
  { keys: "Esc", description: "Exit focus mode" },
  { keys: "?", description: "Open this shortcut help" },
];

interface ShortcutsHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsHelpDialog({ open, onOpenChange }: ShortcutsHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Work faster without leaving the keyboard.</DialogDescription>
        </DialogHeader>
        <ul className="mt-2 space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between text-sm">
              <span className="text-zinc-300">{s.description}</span>
              <kbd className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs font-mono text-zinc-300">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
