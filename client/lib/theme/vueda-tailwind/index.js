/**
 * @module theme/vueda-tailwind
 * @description Aggregated Tailwind CSS pass-through theme for all VUEDA Client
 * components. Importing this module eagerly registers every family's theme
 * entries: each family `index.js` side-effect-imports its component `*.theme.js`
 * files, which `patchTheme` themselves into the registry. The default export is
 * then a snapshot of the populated registry, so the legacy global-eager path
 * `setTheme(vuedaTailwind)` installs the complete theme exactly as before.
 *
 * Source-of-truth for slot data lives in the per-component `*.theme.js` files;
 * the family `index.js` files carry only the ordered key + group-banner manifest
 * that docs-tooling reads. Integrators wanting a leaner bundle skip this barrel
 * and let each component's `*.theme.js` register on demand (the fully-lazy path),
 * or import only the family `index.js` files they use (the per-family path).
 */
import "@vueda/theme/vueda-tailwind/controls/index.js";
import "@vueda/theme/vueda-tailwind/display/index.js";
import "@vueda/theme/vueda-tailwind/feedback/index.js";
import "@vueda/theme/vueda-tailwind/form/index.js";
import "@vueda/theme/vueda-tailwind/grid/index.js";
import "@vueda/theme/vueda-tailwind/navigation/index.js";
import "@vueda/theme/vueda-tailwind/objects-grid/index.js";
import "@vueda/theme/vueda-tailwind/shell/index.js";
import "@vueda/theme/vueda-tailwind/views/index.js";
import "@vueda/theme/vueda-tailwind/widgets/index.js";
import { getTheme } from "@vueda/use/themeRegistry.js";

export default getTheme();
