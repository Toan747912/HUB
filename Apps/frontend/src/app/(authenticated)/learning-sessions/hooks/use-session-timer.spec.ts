import { deriveElapsedSeconds } from "./use-session-timer";

describe("deriveElapsedSeconds", () => {
  it("returns accumulated elapsed seconds while active and not paused", () => {
    const now = new Date("2026-01-01T00:05:00.000Z").getTime();
    const startedAt = new Date("2026-01-01T00:00:00.000Z");

    const elapsed = deriveElapsedSeconds(
      { startedAt, pausedAt: null, elapsedSeconds: 0 },
      "ACTIVE",
      now,
    );

    expect(elapsed).toBe(300);
  });

  it("returns the frozen elapsedSeconds while paused, ignoring wall-clock time", () => {
    const now = new Date("2026-01-01T00:10:00.000Z").getTime();
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const pausedAt = new Date("2026-01-01T00:02:00.000Z");

    const elapsed = deriveElapsedSeconds(
      { startedAt, pausedAt, elapsedSeconds: 120 },
      "PAUSED",
      now,
    );

    expect(elapsed).toBe(120);
  });

  it("adds ongoing active time on top of previously accumulated seconds after a resume", () => {
    const now = new Date("2026-01-01T00:03:00.000Z").getTime();
    // Resumed at 00:02:00 with 120s already accumulated from the first active stretch.
    const startedAt = new Date("2026-01-01T00:02:00.000Z");

    const elapsed = deriveElapsedSeconds(
      { startedAt, pausedAt: null, elapsedSeconds: 120 },
      "ACTIVE",
      now,
    );

    expect(elapsed).toBe(180);
  });

  it("returns 0 when there is no timer yet", () => {
    expect(deriveElapsedSeconds(null, "DRAFT")).toBe(0);
  });
});
