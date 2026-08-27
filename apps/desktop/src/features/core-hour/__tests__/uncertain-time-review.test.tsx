// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UncertainTimeReview } from "../components/uncertain-time-review";

vi.mock("../../../lib/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

describe("UncertainTimeReview", () => {
  it("offers discard, keep, and custom included time", () => {
    const onResolve = vi.fn();
    const view = render(
      <UncertainTimeReview
        interval={{
          reason: "system-idle",
          durationSeconds: 305,
          countedSeconds: 305,
          detectedAt: "2026-08-28T10:00:00.000Z",
        }}
        onResolve={onResolve}
      />,
    );

    fireEvent.click(view.getByRole("button", { name: "coreHour.discardUncertain" }));
    fireEvent.click(view.getByRole("button", { name: "coreHour.keepAllUncertain" }));
    fireEvent.change(view.getByLabelText("coreHour.includedMinutes"), {
      target: { value: "2" },
    });
    fireEvent.click(view.getByRole("button", { name: "coreHour.applyTrim" }));

    expect(onResolve.mock.calls.map(([seconds]) => seconds)).toEqual([0, 305, 120]);
  });
});
