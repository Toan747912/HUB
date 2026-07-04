import type { EvidenceRecordLike, SessionLike } from "../types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}

export function toDate(value: string | Date | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** All calendar dates (as toDateString()) on which a timer started or evidence was recorded. */
export function collectActiveDates(sessions: SessionLike[]): Set<string> {
  const dates = new Set<string>();
  for (const s of sessions) {
    for (const t of s.timers ?? []) {
      const d = toDate(t.startedAt);
      if (d) dates.add(d.toDateString());
    }
    for (const e of s.evidence ?? []) {
      const d = toDate(e.recordedAt);
      if (d) dates.add(d.toDateString());
    }
  }
  return dates;
}

export function computeStreakDays(sessions: SessionLike[], now: Date): number {
  const activeDates = collectActiveDates(sessions);
  if (activeDates.size === 0) return 0;

  const cursor = new Date(now);
  if (!activeDates.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activeDates.has(cursor.toDateString())) return 0;
  }
  let streak = 0;
  while (activeDates.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function allEvidence(sessions: SessionLike[]): EvidenceRecordLike[] {
  return sessions.flatMap((s) => s.evidence ?? []);
}

export function evidenceInRange(
  sessions: SessionLike[],
  start: Date,
  end: Date,
): EvidenceRecordLike[] {
  return allEvidence(sessions).filter((e) => {
    const d = toDate(e.recordedAt);
    return d !== null && d.getTime() >= start.getTime() && d.getTime() < end.getTime();
  });
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function totalMinutesInRange(sessions: SessionLike[], start: Date, end: Date): number {
  let seconds = 0;
  for (const s of sessions) {
    for (const t of s.timers ?? []) {
      const started = toDate(t.startedAt);
      if (started && started.getTime() >= start.getTime() && started.getTime() < end.getTime()) {
        seconds += t.elapsedSeconds || 0;
      }
    }
  }
  return Math.round(seconds / 60);
}

export function daysAgo(now: Date, n: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}

export function startOfWeek(now: Date): Date {
  const d = new Date(now);
  const dayOffset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
