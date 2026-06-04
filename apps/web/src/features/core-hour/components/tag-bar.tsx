"use client";

import React, { useState } from "react";
import { useTags } from "../hooks/use-tags";
import { Button } from "@memo/ui";

interface TagBarProps {
  userId: string;
}

export function TagBar({ userId }: TagBarProps) {
  const { activeTags, addTag, archiveTag } = useTags();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [adding, setAdding] = useState(false);

  const tags = activeTags();

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await addTag(name, newColor, userId);
      setNewName("");
    } finally {
      setAdding(false);
    }
  }

  async function handleArchive(id: string) {
    await archiveTag(id);
  }

  return (
    <div className="space-y-4" data-testid="tag-bar">
      <h3 className="text-sm font-semibold text-gray-900">Tags</h3>

      {/* Tag list */}
      {tags.length === 0 && (
        <p className="text-sm text-gray-500">No tags yet. Add one below.</p>
      )}

      <ul className="flex flex-wrap gap-2" data-testid="tag-list">
        {tags.map((tag) => (
          <li
            key={tag.id}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
            style={{
              backgroundColor: tag.color + "20",
              color: tag.color,
            }}
            data-testid={`tag-${tag.name}`}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: tag.color }}
              aria-hidden="true"
            />
            {tag.name}
            <button
              type="button"
              onClick={() => handleArchive(tag.id)}
              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-current opacity-60 hover:opacity-100"
              aria-label={`Remove ${tag.name}`}
              data-testid={`remove-tag-${tag.name}`}
            >
              &times;
            </button>
          </li>
        ))}
      </ul>

      {/* Add tag form */}
      <div className="flex items-center gap-2" data-testid="add-tag-form">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Tag name..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          data-testid="tag-name-input"
        />
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-lg border border-gray-300 p-0.5"
          aria-label="Tag color"
          data-testid="tag-color-input"
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          isLoading={adding}
          disabled={adding || !newName.trim()}
          onClick={handleAdd}
          data-testid="add-tag-button"
        >
          Add
        </Button>
      </div>
    </div>
  );
}
