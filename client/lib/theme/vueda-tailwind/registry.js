/**
 * @module theme/vueda-tailwind/registry
 * @description Registers Tailwind conflict rules before any built-in defaults.
 * Every component theme uses this entry point, including themes loaded through
 * a family import or a lazy route. Core and other themes do not import it.
 */
import { mergeClasses } from "./classMerger.js";
import { setClassMerger } from "@vueda/use/themeRegistry.js";

setClassMerger(mergeClasses);

export { patchTheme } from "@vueda/use/themeRegistry.js";
