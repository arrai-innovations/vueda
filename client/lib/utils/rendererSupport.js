/**
 * Helper to get slot names with a specific prefix, excluding certain slots.
 *
 * @param {{[slotName: string]: any}} slots - The slots object
 * @param {string} prefix - The prefix to filter slot names by.
 * @param {string[]} exclude - List of slot names or suffixes to exclude.
 * @param {boolean} [retainFullName=false] - If true, the full slot name is returned without slicing the prefix.
 * @param {boolean} [keepEmptySuffix=false] - If true, empty suffixes are kept in the result.
 * @returns {[string, string][]} - An array of slot names and the slot name without the prefix.
 *  i.e. (outerName, innerName)
 */
export const getPrefixedSlots = (slots, prefix, retainFullName = false, exclude = [], keepEmptySuffix = true) => {
    return Object.keys(slots)
        .filter((slotName) => slotName.startsWith(prefix) && !exclude.includes(slotName))
        .map((slotName) => [slotName, retainFullName ? slotName : slotName.slice(prefix.length)])
        .filter(([, inner]) => (keepEmptySuffix || inner?.length) && !exclude.includes(inner));
};

/**
 * Get all matching prefixed slots for a given type and fieldName.
 *
 * @param {{[slotName: string]: any}} slots - The slots object
 * @param {string} prefixType - e.g., 'field', 'widget', 'header'
 * @param {string} fieldName - e.g., 'foo' or 'foo__bar'
 * @param {string[]} exclude - List of slot names or suffixes to exclude.
 * @param {boolean} [checkExpanded=false] - If true, expanded slots are also checked.
 * @param {boolean} [keepEmptySuffix=true] - If true, empty suffixes are kept in the result.
 * @returns {[string, string][]} - [outerName, innerName] slot pairs
 */
export const getSlotNamesFor = (
    slots,
    prefixType,
    fieldName,
    exclude = [],
    checkExpanded = false,
    keepEmptySuffix = true,
) => {
    const basePrefix = `${prefixType}(${fieldName})`;
    const expandedPrefix = `${prefixType}(${fieldName}__`;

    const baseSlots = getPrefixedSlots(slots, basePrefix, false, exclude, keepEmptySuffix);

    if (checkExpanded) {
        const expandedSlots = getPrefixedSlots(slots, expandedPrefix, true, exclude, keepEmptySuffix); // retain full name
        return [...baseSlots, ...expandedSlots].filter(([slotName]) => slots[slotName]);
    }
    return baseSlots.filter(([slotName]) => slots[slotName]);
};

/**
 * Resolve the best-matching outer slot name based on inner suffix priority.
 *
 * @param {string[]} innerNamesInOrder - The inner names in order of precedence.
 * @param {string} prefixType - The prefix type (e.g., 'field', 'widget').
 * @param {string} fieldName - The field name (e.g., 'foo' or 'foo__bar').
 * @param {{[slotName: string]: any}} slots - The slots object.
 */
export function resolveSlotName(innerNamesInOrder, prefixType, fieldName, slots) {
    const basePrefix = `${prefixType}(${fieldName})`;

    for (const inner of innerNamesInOrder) {
        const outerSlotName = basePrefix + inner;
        if (slots[outerSlotName]) {
            return outerSlotName;
        }
    }
    return undefined;
}
