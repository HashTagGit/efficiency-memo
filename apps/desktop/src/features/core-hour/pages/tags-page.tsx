import React, { useEffect, useState } from "react";
import { useTags, TagsProvider } from "../hooks/use-tags";

function TagsPageInner() {
  const { tags, loadTags, addTag, renameTag, archiveTag } = useTags();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    loadTags("local");
  }, [loadTags]);

  const activeTags = tags.filter((t) => !t.is_archived);
  const archivedTags = tags.filter((t) => t.is_archived);

  const handleAdd = async () => {
    const name = newTagName.trim();
    if (!name) return;
    await addTag(name, newTagColor, "local");
    setNewTagName("");
  };

  const handleRename = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    await renameTag(id, name);
    setEditingId(null);
    setEditingName("");
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  return (
    <div data-testid="ch-tags-page" className="space-y-6">
      {/* Add tag form */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Create New Tag</h3>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label
              htmlFor="new-tag-name"
              className="text-xs font-medium text-muted-foreground block mb-1"
            >
              Name
            </label>
            <input
              id="new-tag-name"
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="deep-work"
              data-testid="ch-new-tag-name"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label
              htmlFor="new-tag-color"
              className="text-xs font-medium text-muted-foreground block mb-1"
            >
              Color
            </label>
            <input
              id="new-tag-color"
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              data-testid="ch-new-tag-color"
              className="h-9 w-12 cursor-pointer rounded-md border bg-background"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newTagName.trim()}
            data-testid="ch-create-tag"
            className="inline-flex items-center justify-center rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background hover:bg-accent-strong disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>

      {/* Active tags */}
      {activeTags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">
            Active Tags ({activeTags.length})
          </h3>
          <div className="space-y-2">
            {activeTags.map((tag) => (
              <div
                key={tag.id}
                data-testid={`ch-tag-item-${tag.name}`}
                className="rounded-lg border bg-card p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  {editingId === tag.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(tag.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => handleRename(tag.id)}
                      autoFocus
                      data-testid="ch-rename-input"
                      className="flex-1 rounded border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent"
                    />
                  ) : (
                    <span className="text-sm font-medium">{tag.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditing(tag.id, tag.name)}
                    data-testid={`ch-rename-tag-${tag.name}`}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => archiveTag(tag.id)}
                    data-testid={`ch-archive-tag-${tag.name}`}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Archived tags */}
      {archivedTags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">
            Archived ({archivedTags.length})
          </h3>
          <div className="space-y-2 opacity-60">
            {archivedTags.map((tag) => (
              <div
                key={tag.id}
                className="rounded-lg border bg-card p-3 flex items-center gap-3"
              >
                <span
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-sm">{tag.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tags.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No tags yet. Create your first tag above.
        </p>
      )}
    </div>
  );
}

export default function TagsPage() {
  return (
    <TagsProvider>
      <TagsPageInner />
    </TagsProvider>
  );
}
