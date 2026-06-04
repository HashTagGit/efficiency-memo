import type { Metadata } from "next";
import { chManifest } from "@/features/core-hour/manifest";
import { TagsPage } from "./tags-page";

export const metadata: Metadata = {
  title: `${chManifest.name} Tags`,
  description: "Manage CoreHour tags and categories",
};

export default function CoreHourTagsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">Tag Management</h1>
      <p className="text-muted mt-1 mb-6">
        Create, rename, and archive tracking tags
      </p>
      <TagsPage />
    </div>
  );
}
