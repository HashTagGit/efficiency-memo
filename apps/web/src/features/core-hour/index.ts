import { chManifest } from "./manifest";
import { chComponentLoader } from "./component-loader";
import { registerTool } from "@/lib/tool-registry/registry";

// Register CoreHour tool on import
registerTool(chManifest, chComponentLoader);
