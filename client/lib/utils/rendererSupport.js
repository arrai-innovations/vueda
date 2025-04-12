/**
 * Helper to get slot names with a specific prefix, excluding certain slots.
 *
 * @param slots {{[slotName: string]: any}} - The slots object
 * @param prefix {string} - The prefix to filter slot names by.
 * @param exclude {string[]} - List of slot names or suffixes to exclude.
 * @param retainFullName {boolean} - If true, the full slot name is returned without slicing the prefix.
 * @returns {[string, string][]} - An array of slot names and the slot name without the prefix.
 *  i.e. (outerName, innerName)
 */
export const getPrefixedSlots = (slots, prefix, retainFullName = false, exclude = []) => {
    return Object.keys(slots)
        .filter((slotName) => slotName.startsWith(prefix) && !exclude.includes(slotName))
        .map((slotName) => [slotName, retainFullName ? slotName : slotName.slice(prefix.length)])
        .filter(([, inner]) => inner?.length && !exclude.includes(inner));
};

/**
 * Get all matching prefixed slots for a given type and fieldName.
 *
 * @param {{[slotName: string]: any}} slots - The slots object
 * @param {string} prefixType - e.g., 'field', 'widget', 'header'
 * @param {string} fieldName - e.g., 'foo' or 'foo__bar'
 * @param {string[]} exclude - List of slot names or suffixes to exclude.
 * @returns {[string, string][]} - [outerName, innerName] slot pairs
 */
export const getSlotNamesFor = (slots, prefixType, fieldName, exclude = []) => {
    const basePrefix = `${prefixType}(${fieldName})`;
    const expandedPrefix = `${prefixType}(${fieldName}__`;

    const baseSlots = getPrefixedSlots(slots, basePrefix, false, exclude);
    const expandedSlots = getPrefixedSlots(slots, expandedPrefix, true, exclude); // retain full

    return [...baseSlots, ...expandedSlots].filter(([slotName]) => slots[slotName]);
};
