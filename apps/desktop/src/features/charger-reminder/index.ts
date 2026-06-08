import { crManifest } from "./manifest";
import { crComponentLoader } from "./component-loader";
import { registerTool } from "../../lib/tool-registry/registry";

// Register Charger Reminder tool on import
registerTool(crManifest, crComponentLoader);

export { crManifest, crComponentLoader };
