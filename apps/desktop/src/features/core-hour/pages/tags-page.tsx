import React, { useEffect, useState } from "react";
import { Button } from "@memo/ui";
import { useTags } from "../hooks/use-tags";

export default function TagsPage({ userId }: { userId: string }) {
  const { tags, loadTags, addTag, renameTag, archiveTag } = useTags();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => { void loadTags(userId); }, [loadTags, userId]);

  async function createTag() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addTag(trimmed, color, userId);
    setName("");
  }

  async function saveRename() {
    if (!editingId || !editingName.trim()) return;
    await renameTag(editingId, editingName.trim());
    setEditingId(null);
  }

  return (
    <div className="max-w-xl space-y-6" data-testid="ch-tags-page">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-sm font-medium">New tag
          <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2" placeholder="Deep work" />
        </label>
        <label className="text-sm font-medium">Color
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="mt-1 block h-10 w-12 rounded-md border" />
        </label>
        <Button type="button" disabled={!name.trim()} onClick={() => void createTag()}>Add tag</Button>
      </div>
      <ul className="space-y-2">
        {tags.map((tag) => (
          <li key={tag.id} className="flex items-center gap-3 border-t py-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden="true" />
            {editingId === tag.id ? (
              <input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveRename(); }} className="flex-1 rounded-md border bg-background px-2 py-1" />
            ) : <span className="flex-1 text-sm">{tag.name}</span>}
            {!tag.is_archived && (editingId === tag.id ? <Button type="button" size="sm" onClick={() => void saveRename()}>Save</Button> : <>
              <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingId(tag.id); setEditingName(tag.name); }}>Rename</Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => void archiveTag(tag.id)}>Archive</Button>
            </>)}
            {tag.is_archived && <span className="text-xs text-muted-foreground">Archived</span>}
          </li>
        ))}
      </ul>
      {tags.length === 0 && <p className="text-sm text-muted-foreground">Create a tag before your first check-in.</p>}
    </div>
  );
}
