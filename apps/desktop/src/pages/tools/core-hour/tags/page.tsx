import TagsPage from "../../../../features/core-hour/pages/tags-page";

export default function CoreHourTagsRoute() {
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
