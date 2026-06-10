// Placeholder component loader -- actual component loaded from pages/dashboard-page
export const chComponentLoader = () =>
  import("./pages/dashboard-page").then((m) => ({
    default: m.default ?? (() => null),
  }));
