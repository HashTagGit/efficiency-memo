import { registerTool } from "../../lib/tool-registry/registry";
import { pauseHydrateComponentLoader } from "./component-loader";
import { pauseHydrateManifest } from "./manifest";

registerTool(pauseHydrateManifest, pauseHydrateComponentLoader);

export { pauseHydrateComponentLoader, pauseHydrateManifest };
