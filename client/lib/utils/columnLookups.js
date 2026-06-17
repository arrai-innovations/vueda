/**
 * @module utils/columnLookups
 * @description Registry of all available list column adapter components. Mirrors `formLookups.js` (fields/widgets). String-keyed so model config and the `columnComponents` prop can reference an adapter by name without importing the component.
 */
import ColumnText from "@vueda/components/ColumnText.vue";
import { markRaw } from "vue";

/**
 * A column adapter reference: a component, or a lazy loader resolving to one.
 *
 * @typedef {import('vue').Component | (()=>Promise<import('vue').Component>)} ColumnComponent
 */

/**
 * Available list column adapters, keyed by name.
 *
 * `ColumnText` is imported directly (not lazy) because it is the universal
 * fallback rendered by most cells; code-splitting it would add a load tick to
 * the common path. Heavier, type-specific adapters (added in later phases) are
 * lazily loaded.
 *
 * @type {{[columnComponentName:string]: ColumnComponent}}
 */
export const availableColumns = {
    ColumnText: markRaw(ColumnText),
};
