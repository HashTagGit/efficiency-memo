// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTimer } from "../hooks/use-timer";
import { readSystemIdleSeconds } from "../../../lib/system-idle";

vi.mock("../../../lib/system-idle", () => ({
  readSystemIdleSeconds: vi.fn().mockResolvedValue(null),
}));

describe("useTimer restoration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readSystemIdleSeconds).mockResolvedValue(null);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-28T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("continues ticking after a restored paused session resumes", () => {
    const { result, unmount } = renderHook(() => useTimer());
    act(() => result.current.restore(42));
    expect(result.current).toMatchObject({
      elapsed: 42,
      isRunning: true,
      isPaused: true,
    });

    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.elapsed).toBe(44);
    unmount();
  });

  it("requires a restored uncertain interval to be resolved before ticking", () => {
    const { result, unmount } = renderHook(() => useTimer());
    act(() => result.current.restore(600, {
      reason: "system-idle",
      durationSeconds: 300,
      countedSeconds: 300,
      detectedAt: "2026-08-28T09:55:00.000Z",
    }));

    act(() => result.current.resume());
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.elapsed).toBe(600);

    act(() => result.current.resolveUncertainInterval(0));
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.elapsed).toBe(301);
    expect(result.current.uncertainInterval).toBeNull();
    unmount();
  });

  it("pauses after counted Windows system idle is detected", async () => {
    const { result, unmount } = renderHook(() => useTimer());
    act(() => result.current.start());
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(result.current.elapsed).toBe(300);

    vi.mocked(readSystemIdleSeconds).mockResolvedValue(305);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });

    expect(result.current.isPaused).toBe(true);
    expect(result.current.uncertainInterval).toMatchObject({
      reason: "system-idle",
      durationSeconds: 305,
      countedSeconds: 305,
    });
    unmount();
  });

  it("does not treat a manual pause as a scheduler gap", async () => {
    const { result, unmount } = renderHook(() => useTimer());
    act(() => result.current.start());
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    act(() => result.current.pause());
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    act(() => result.current.resume());
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });

    expect(result.current.elapsed).toBe(2);
    expect(result.current.uncertainInterval).toBeNull();
    unmount();
  });

  it("pauses without incrementing when a scheduler gap wins detection", async () => {
    const { result, unmount } = renderHook(() => useTimer());
    act(() => result.current.start());
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(result.current.elapsed).toBe(1);

    vi.setSystemTime(new Date("2026-08-28T10:00:32.000Z"));
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(result.current.elapsed).toBe(1);
    expect(result.current.uncertainInterval).toMatchObject({
      reason: "scheduler-gap",
      countedSeconds: 0,
    });

    vi.mocked(readSystemIdleSeconds).mockResolvedValue(600);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(result.current.uncertainInterval?.reason).toBe("scheduler-gap");
    unmount();
  });
});
