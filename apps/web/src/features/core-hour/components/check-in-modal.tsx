"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Button, Modal } from "@memo/ui";
import type { Session, Tag } from "../types";

export interface CheckInData {
  sessionId: string;
  tags: Array<{ tagId: string; percentage: number }>;
  note: string;
}

export interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  tags: Tag[];
  onCheckIn?: (data: CheckInData) => Promise<void> | void;
  onSkip?: () => Promise<void> | void;
}

interface TagSplitEntry {
  tagId: string;
  percentage: number;
}

export function CheckInModal({
  isOpen,
  onClose,
  session,
  tags,
  onCheckIn,
  onSkip,
}: CheckInModalProps) {
  const [note, setNote] = useState("");
  const [splits, setSplits] = useState<TagSplitEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPercentage = useMemo(
    () => splits.reduce((sum, s) => sum + s.percentage, 0),
    [splits],
  );

  const isComplete = totalPercentage === 100 && splits.length > 0;

  const toggleTag = useCallback((tagId: string) => {
    setError(null);
    setSplits((prev) => {
      const existing = prev.find((s) => s.tagId === tagId);
      if (existing) {
        return prev.filter((s) => s.tagId !== tagId);
      }
      return [...prev, { tagId, percentage: 0 }];
    });
  }, []);

  const updatePercentage = useCallback((tagId: string, value: number) => {
    setError(null);
    setSplits((prev) => {
      const clamped = Math.max(0, Math.min(100, Number.isNaN(value) ? 0 : value));
      return prev.map((s) => (s.tagId === tagId ? { ...s, percentage: clamped } : s));
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);

    if (splits.length === 0) {
      setError("Select at least one tag");
      return;
    }

    if (totalPercentage !== 100) {
      setError(`Percentages must total 100% (currently ${totalPercentage}%)`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (onCheckIn) {
        await onCheckIn({
          sessionId: session.id,
          tags: splits.filter((s) => s.percentage > 0),
          note: note.trim(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [splits, totalPercentage, onCheckIn, session.id, note]);

  const handleSkip = useCallback(async () => {
    setIsSubmitting(true);
    try {
      if (onSkip) {
        await onSkip();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Skip failed");
    } finally {
      setIsSubmitting(false);
    }
  }, [onSkip]);

  const elapsedTime = useMemo(() => {
    const start = new Date(session.started_at).getTime();
    const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
    const diffMs = end - start;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, [session.started_at, session.ended_at]);

  const startedLabel = useMemo(() => {
    const d = new Date(session.started_at);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [session.started_at]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Core Hour Check-In">
      <div className="space-y-6" data-testid="check-in-modal">
        {/* Session Info */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="text-sm text-gray-500">
            Started at <span className="font-medium text-gray-700">{startedLabel}</span>
          </div>
          <div className="text-sm text-gray-500">
            Elapsed: <span className="font-medium text-gray-700">{elapsedTime}</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            role="alert"
            data-testid="check-in-error"
          >
            {error}
          </div>
        )}

        {/* Tag Split */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">
            Tag Split
          </label>

          {tags.length === 0 ? (
            <p className="text-sm text-gray-400">No tags available</p>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => {
                const split = splits.find((s) => s.tagId === tag.id);
                const isSelected = !!split;

                return (
                  <div
                    key={tag.id}
                    data-testid={`tag-row-${tag.id}`}
                    className="flex items-center gap-3"
                  >
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTag(tag.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        data-testid={`tag-checkbox-${tag.id}`}
                      />
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-gray-900">{tag.name}</span>
                    </label>

                    {isSelected && (
                      <div className="ml-auto flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={split!.percentage}
                          onChange={(e) =>
                            updatePercentage(tag.id, parseInt(e.target.value, 10))
                          }
                          className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 text-right focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          data-testid={`tag-percentage-${tag.id}`}
                        />
                        <span className="text-sm text-gray-400 w-4">%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Total indicator */}
          {splits.length > 0 && (
            <div
              className={`text-sm font-medium ${
                totalPercentage === 100 ? "text-green-600" : "text-amber-600"
              }`}
              data-testid="total-percentage"
            >
              Total: {totalPercentage}%
              {totalPercentage !== 100 && " (must be 100%)"}
            </div>
          )}
        </div>

        {/* Note */}
        <div className="space-y-2">
          <label
            htmlFor="check-in-note"
            className="text-sm font-semibold text-gray-700"
          >
            Note <span className="text-gray-400">— Optional</span>
          </label>
          <textarea
            id="check-in-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you work on?"
            rows={3}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            data-testid="check-in-note"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting || !isComplete}
            onClick={handleSubmit}
            className="flex-1"
            data-testid="check-in-submit"
          >
            Check In
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            onClick={handleSkip}
            data-testid="check-in-skip"
          >
            Skip
          </Button>
        </div>
      </div>
    </Modal>
  );
}
