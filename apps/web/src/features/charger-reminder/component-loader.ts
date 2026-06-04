import { crManifest } from "./manifest";

// Placeholder component loader - actual component loaded from pages/device-list-page
// This will be replaced in Task 29 when pages are created
export const crComponentLoader = () =>
  import("./pages/device-list-page").then((m) => ({
    default: m.default ?? (() => null),
  }));