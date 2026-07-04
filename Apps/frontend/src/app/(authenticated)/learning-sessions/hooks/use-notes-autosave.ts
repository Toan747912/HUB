import * as React from "react";

const AUTOSAVE_DEBOUNCE_MS = 1800;

interface UseNotesAutosaveOptions {
  sessionId: string;
  serverContent: string;
  serverUpdatedAt: string | null;
  disabled: boolean;
  onSave: (content: string) => Promise<unknown>;
}

function draftKey(sessionId: string) {
  return `learning-session-notes-draft:${sessionId}`;
}

export function useNotesAutosave({
  sessionId,
  serverContent,
  serverUpdatedAt,
  disabled,
  onSave,
}: UseNotesAutosaveOptions) {
  const [content, setContent] = React.useState(serverContent);
  const [status, setStatus] = React.useState<"idle" | "saving" | "saved">("idle");
  const [recoverableDraft, setRecoverableDraft] = React.useState<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const seededRef = React.useRef(false);

  // Seed from server content once per session, checking for a newer local draft first.
  React.useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    setContent(serverContent);

    try {
      const raw = localStorage.getItem(draftKey(sessionId));
      if (!raw) return;
      const draft = JSON.parse(raw) as { content: string; updatedAt: string };
      const draftIsNewer =
        !serverUpdatedAt ||
        new Date(draft.updatedAt).getTime() > new Date(serverUpdatedAt).getTime();
      if (draftIsNewer && draft.content !== serverContent) {
        setRecoverableDraft(draft.content);
      }
    } catch {
      // ignore malformed draft
    }
  }, [sessionId, serverContent, serverUpdatedAt]);

  const clearDraft = React.useCallback(() => {
    localStorage.removeItem(draftKey(sessionId));
  }, [sessionId]);

  const persistDraft = React.useCallback(
    (value: string) => {
      localStorage.setItem(
        draftKey(sessionId),
        JSON.stringify({ content: value, updatedAt: new Date().toISOString() }),
      );
    },
    [sessionId],
  );

  const save = React.useCallback(
    async (value: string) => {
      setStatus("saving");
      try {
        await onSave(value);
        setStatus("saved");
        clearDraft();
      } catch {
        setStatus("idle");
      }
    },
    [onSave, clearDraft],
  );

  const handleChange = React.useCallback(
    (value: string) => {
      setContent(value);
      persistDraft(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        save(value);
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [persistDraft, save],
  );

  const saveNow = React.useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!disabled) save(content);
  }, [content, disabled, save]);

  const acceptDraft = React.useCallback(() => {
    if (recoverableDraft === null) return;
    setContent(recoverableDraft);
    setRecoverableDraft(null);
    save(recoverableDraft);
  }, [recoverableDraft, save]);

  const dismissDraft = React.useCallback(() => {
    setRecoverableDraft(null);
    clearDraft();
  }, [clearDraft]);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { content, status, recoverableDraft, handleChange, saveNow, acceptDraft, dismissDraft };
}
