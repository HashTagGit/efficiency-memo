import { crManifest } from "./manifest";

// Lazy-load the charger reminder routes component
export const crComponentLoader = () =>
  import("./pages/charger-reminder-routes").then((m) => ({
    default: m.default ?? (() => null),
  }));
