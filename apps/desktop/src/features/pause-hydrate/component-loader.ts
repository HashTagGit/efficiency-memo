export const pauseHydrateComponentLoader = () =>
  import("./pages/pause-hydrate-page").then((module) => ({
    default: module.default ?? (() => null),
  }));
