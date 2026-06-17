/**
 * @module utils/sortedFields
 * @description Pure helpers for the ViewList sort order representation: an array of field
 * names where a leading `-` marks descending order (e.g. `["-updated", "mrr"]` is Updated
 * descending, then MRR ascending). This is the single home for the `-` prefix convention and
 * the add / remove / toggle edit operations, shared by the sort surfaces (column-header
 * sorting in `ObjectsGrid` and the `SortEditor` multi-field editor) so they cannot drift.
 *
 * A given base field appears at most once in a sort order, so edits are keyed by base field
 * name rather than by array position. Every function is non-mutating and returns a fresh array.
 */

/**
 * @typedef {object} ParsedSortField
 * @property {string} base - The field name with any leading `-` stripped.
 * @property {boolean} descending - True when the entry was prefixed with `-`.
 */

/**
 * Split a sort entry into its base field name and direction.
 *
 * @param {string} entry - A sort entry such as `"name"` or `"-name"`.
 * @returns {ParsedSortField}
 */
export function parseSortField(entry) {
    const descending = typeof entry === "string" && entry.startsWith("-");
    const base = descending ? entry.slice(1) : (entry ?? "");
    return { base, descending };
}

/**
 * Build a sort entry from a base field name and direction.
 *
 * @param {string} base - The field name.
 * @param {boolean} [descending] - When true, prefix with `-`.
 * @returns {string}
 */
export function formatSortField(base, descending = false) {
    return descending ? `-${base}` : base;
}

/**
 * The base field name of every entry, direction stripped.
 *
 * @param {string[]} sorted - The sort order.
 * @returns {string[]}
 */
export function sortFieldBases(sorted) {
    return sorted.map((entry) => parseSortField(entry).base);
}

/**
 * Position of `base` within the sort order, regardless of direction; `-1` when absent.
 *
 * @param {string[]} sorted - The sort order.
 * @param {string} base - The base field name to find.
 * @returns {number}
 */
export function indexOfSortField(sorted, base) {
    return sortFieldBases(sorted).indexOf(base);
}

/**
 * Append `base` to the sort order. No-op (returns a copy) when `base` is already present.
 *
 * @param {string[]} sorted - The sort order.
 * @param {string} base - The base field name to add.
 * @param {{descending?: boolean}} [options] - Initial direction; ascending by default.
 * @returns {string[]} A fresh array.
 */
export function addSortField(sorted, base, { descending = false } = {}) {
    if (indexOfSortField(sorted, base) !== -1) {
        return [...sorted];
    }
    return [...sorted, formatSortField(base, descending)];
}

/**
 * Remove `base` from the sort order (matched by base, ignoring direction).
 *
 * @param {string[]} sorted - The sort order.
 * @param {string} base - The base field name to remove.
 * @returns {string[]} A fresh array.
 */
export function removeSortField(sorted, base) {
    return sorted.filter((entry) => parseSortField(entry).base !== base);
}

/**
 * Flip the direction of `base` in place within the sort order. No-op (returns a copy) when
 * `base` is absent; other entries keep their position and direction.
 *
 * @param {string[]} sorted - The sort order.
 * @param {string} base - The base field name to toggle.
 * @returns {string[]} A fresh array.
 */
export function toggleSortField(sorted, base) {
    return sorted.map((entry) => {
        const parsed = parseSortField(entry);
        return parsed.base === base ? formatSortField(parsed.base, !parsed.descending) : entry;
    });
}
