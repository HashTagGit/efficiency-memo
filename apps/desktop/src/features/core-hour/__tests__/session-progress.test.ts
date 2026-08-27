import { describe, expect, it, vi } from "vitest";
import {
  readSessionProgress,
  writeSessionProgress,
} from "../session-progress";

function memoryStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => { value = next; }),
    removeItem: vi.fn(() => { value = null; }),
  };
}

describe("active session progress", () => {
  it("round-trips an unresolved interval for the same session", () => {
    const storage = memoryStorage();
    writeSessionProgress({
      sessionId: "session-1",
      elapsedSeconds: 600,
      recordedSeconds: 300,
      uncertainInterval: {
        reason: "system-idle",
        durationSeconds: 300,
        countedSeconds: 300,
        detectedAt: "2026-08-28T10:00:00.000Z",
      },
    }, storage);
    expect(readSessionProgress("session-1", storage)).toMatchObject({
      elapsedSeconds: 600,
      uncertainInterval: { reason: "system-idle", durationSeconds: 300 },
    });
  });

  it("accepts a legacy snapshot and removes malformed progress", () => {
    const legacy = memoryStorage(JSON.stringify({
      sessionId: "session-1",
      elapsedSeconds: 42,
      recordedSeconds: 0,
    }));
    expect(readSessionProgress("session-1", legacy)?.uncertainInterval).toBeNull();

    const malformed = memoryStorage("{\"sessionId\":\"session-1\",\"elapsedSeconds\":-1}");
    expect(readSessionProgress("session-1", malformed)).toBeNull();
    expect(malformed.removeItem).toHaveBeenCalledOnce();

    const overcounted = memoryStorage(JSON.stringify({
      sessionId: "session-1",
      elapsedSeconds: 600,
      recordedSeconds: 500,
      uncertainInterval: {
        reason: "system-idle",
        durationSeconds: 300,
        countedSeconds: 300,
        detectedAt: "2026-08-28T10:00:00.000Z",
      },
    }));
    expect(readSessionProgress("session-1", overcounted)).toBeNull();

    const wrongTypes = memoryStorage(JSON.stringify({
      sessionId: "session-1",
      elapsedSeconds: "600",
      recordedSeconds: null,
    }));
    expect(readSessionProgress("session-1", wrongTypes)).toBeNull();
  });
});
