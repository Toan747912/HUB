"use client";

import * as React from "react";
import { NotebookPen, Check, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotesAutosave } from "../hooks/use-notes-autosave";

interface SessionNotesPanelProps {
  sessionId: string;
  serverContent: string;
  serverUpdatedAt: string | null;
  disabled: boolean;
  onSave: (content: string) => Promise<unknown>;
  notesRef?: React.MutableRefObject<{ saveNow: () => void } | null>;
}

export function SessionNotesPanel({
  sessionId,
  serverContent,
  serverUpdatedAt,
  disabled,
  onSave,
  notesRef,
}: SessionNotesPanelProps) {
  const { content, status, recoverableDraft, handleChange, saveNow, acceptDraft, dismissDraft } =
    useNotesAutosave({
      sessionId,
      serverContent,
      serverUpdatedAt,
      disabled,
      onSave,
    });

  React.useEffect(() => {
    if (notesRef) notesRef.current = { saveNow };
  }, [notesRef, saveNow]);

  return (
    <Card className="border-zinc-800 bg-zinc-900/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-400 flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          Quick Notes
          <span className="ml-auto text-xs font-normal text-zinc-500 flex items-center gap-1">
            {status === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Saving...
              </>
            )}
            {status === "saved" && (
              <>
                <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" /> Saved
              </>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recoverableDraft !== null && (
          <div className="flex items-center justify-between gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
            <span>Recover unsaved draft from a previous visit?</span>
            <div className="flex gap-1 shrink-0">
              <Button type="button" size="sm" variant="outline" onClick={acceptDraft}>
                Recover
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={dismissDraft}>
                Dismiss
              </Button>
            </div>
          </div>
        )}
        <label htmlFor="session-notes" className="sr-only">
          Session notes
        </label>
        <textarea
          id="session-notes"
          value={content}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
          rows={8}
          placeholder="Capture what you're learning as you go..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none disabled:opacity-50"
          aria-describedby="session-notes-counter"
        />
        <div id="session-notes-counter" className="text-xs text-zinc-600 text-right">
          {content.length.toLocaleString()} characters
        </div>
      </CardContent>
    </Card>
  );
}
