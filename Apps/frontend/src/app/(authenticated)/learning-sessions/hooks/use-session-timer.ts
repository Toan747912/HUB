export interface SessionTimerLike {
  startedAt: string | Date;
  pausedAt?: string | Date | null;
  elapsedSeconds: number;
}

/**
 * Pure derivation of elapsed seconds from server-held timer state -- this is what makes the
 * timer survive refresh/tab-close: the client never keeps its own countdown truth, it always
 * recomputes from the last timer + session status returned by the backend.
 */
export function deriveElapsedSeconds(
  timer: SessionTimerLike | null | undefined,
  status: string,
  now: number = Date.now(),
): number {
  if (!timer) return 0;

  const isPaused = Boolean(timer.pausedAt) || status !== "ACTIVE";
  if (isPaused) {
    return timer.elapsedSeconds;
  }

  const startedAtMs = new Date(timer.startedAt).getTime();
  const ongoingSeconds = Math.floor((now - startedAtMs) / 1000);
  return timer.elapsedSeconds + Math.max(0, ongoingSeconds);
}

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
