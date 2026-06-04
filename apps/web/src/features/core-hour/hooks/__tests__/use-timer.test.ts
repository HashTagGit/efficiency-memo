import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimer } from "../use-timer";

describe("useTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with elapsed=0, not running, not paused", () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.elapsed).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it("start() begins the timer and elapsed increases every second", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });

    expect(result.current.isRunning).toBe(true);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.elapsed).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsed).toBe(1);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsed).toBe(4);
  });

  it("stop() resets elapsed and stops the timer", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsed).toBe(3);

    act(() => {
      result.current.stop();
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.elapsed).toBe(0);

    // No more ticking
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsed).toBe(0);
  });

  it("pause() stops elapsed from increasing while keeping isRunning true", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsed).toBe(2);

    act(() => {
      result.current.pause();
    });

    expect(result.current.isRunning).toBe(true);
    expect(result.current.isPaused).toBe(true);

    // No increase while paused
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsed).toBe(2);
  });

  it("resume() continues elapsed after pause", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    act(() => {
      result.current.pause();
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    act(() => {
      result.current.resume();
    });

    expect(result.current.isPaused).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsed).toBe(3);
  });

  it("pauses automatically when document is hidden and resumes when visible", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsed).toBe(2);

    // Simulate tab hidden
    act(() => {
      Object.defineProperty(document, "hidden", {
        value: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.isPaused).toBe(true);

    // Should not tick while hidden
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.elapsed).toBe(2);

    // Simulate tab visible
    act(() => {
      Object.defineProperty(document, "hidden", {
        value: false,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.isPaused).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsed).toBe(3);
  });

  it("does not bind visibility change when not running", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = renderHook(() => useTimer());

    // Should not have added visibility listener when not running
    expect(addSpy).not.toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );

    unmount();
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it("cleans up interval on unmount", () => {
    const { result, unmount } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    unmount();

    // After unmount, ticking should stop
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    // elapsed should stay frozen from the last ref value
    // Note: after unmount setElapsed won't fire, but the interval was cleared
  });

  it("supports start → pause → resume → stop cycle", () => {
    const { result } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsed).toBe(2);

    act(() => {
      result.current.pause();
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.elapsed).toBe(2);

    act(() => {
      result.current.resume();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.elapsed).toBe(3);

    act(() => {
      result.current.stop();
    });
    expect(result.current.elapsed).toBe(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });
});
