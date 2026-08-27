// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { InteractivePlanBlock } from "../components/interactive-plan-block";
import { formatLocalPlanTime } from "../plan-interaction";
import type { PlannedBlock } from "../planned-blocks";

vi.mock("../../../lib/i18n", () => ({
  useI18n: () => ({
    locale: "en-US",
    t: (key: string) => key,
  }),
}));

const plan: PlannedBlock = {
  id: "plan-1",
  title: "Draft",
  tag_id: null,
  tag_name: null,
  tag_color: null,
  status: "planned",
  session_id: null,
  started_at: "2026-08-28T09:00:00+08:00",
  ended_at: "2026-08-28T10:00:00+08:00",
};

beforeAll(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
});

afterEach(cleanup);

function setup() {
  const onEdit = vi.fn();
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <div>
      <InteractivePlanBlock
        plan={plan}
        date="2026-08-28"
        hourHeight={1}
        availableDates={["2026-08-28"]}
        resolvePointer={(_clientX, clientY) => ({ date: "2026-08-28", minute: clientY })}
        onEdit={onEdit}
        onUpdate={onUpdate}
        style={{ left: 0, width: 100 }}
      />
    </div>,
  );
  return {
    move: view.getByRole("button", { name: "coreHour.movePlanNamed" }),
    onEdit,
    onUpdate,
  };
}

describe("InteractivePlanBlock", () => {
  it("keeps click and drag actions distinct", async () => {
    const { move, onEdit, onUpdate } = setup();

    fireEvent.pointerDown(move, { pointerId: 1, clientY: 540 });
    fireEvent.pointerUp(move, { pointerId: 1, clientY: 540 });
    fireEvent.click(move);
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onUpdate).not.toHaveBeenCalled();

    onEdit.mockClear();
    fireEvent.pointerDown(move, { pointerId: 2, clientY: 540 });
    fireEvent.pointerMove(move, { pointerId: 2, clientY: 570 });
    fireEvent.pointerUp(move, { pointerId: 2, clientY: 570 });
    fireEvent.click(move);

    await waitFor(() => expect(onUpdate).toHaveBeenCalledOnce());
    expect(onEdit).not.toHaveBeenCalled();
    const range = onUpdate.mock.calls[0]?.[1];
    expect(formatLocalPlanTime(range.startedAt)).toBe("2026-08-28T09:30");
    expect(formatLocalPlanTime(range.endedAt)).toBe("2026-08-28T10:30");
  });

  it("cancels a gesture when pointer capture is lost", async () => {
    const { move, onEdit, onUpdate } = setup();
    fireEvent.pointerDown(move, { pointerId: 3, clientY: 540 });
    fireEvent.pointerMove(move, { pointerId: 3, clientY: 570 });
    fireEvent.lostPointerCapture(move, { pointerId: 3 });
    fireEvent.pointerUp(move, { pointerId: 3, clientY: 570 });
    fireEvent.click(move);

    await Promise.resolve();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalledOnce();
  });
});
