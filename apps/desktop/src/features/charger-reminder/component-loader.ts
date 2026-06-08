import { crManifest } from "./manifest";

// Lazy-load the device list page component
export const crComponentLoader = () =>
  import("./pages/device-list-page").then((m) => ({
    default: m.default ?? (() => null),
  }));
