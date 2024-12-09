/**
 * Helper to get slot names with a specific prefix, excluding certain slots.
 *
 * @param slots {import("vue").Slots} - The slots object
 * @param prefix {string} - The prefix to filter slot names by.
 * @param exclude {string[]} - List of slot names or suffixes to exclude.
 * @param retainFullName {boolean} - If true, the full slot name is returned without slicing the prefix.
 * @returns {[string, string][]} - An array of slot names and the slot name without the prefix.
 *  i.e. (outerName, innerName)
 */
export const getPrefixedSlots = (slots, prefix, exclude = [], retainFullName = false) => {
    return Object.keys(slots)
        .filter((slotName) => slotName.startsWith(prefix) && !exclude.includes(slotName))
        .map((slotName) => [slotName, retainFullName ? slotName : slotName.slice(prefix.length)])
        .filter(([, insideSlotName]) => insideSlotName?.length && !exclude.includes(insideSlotName));
};

/**
 * Get the slot names for a field or widget.
 *
 * @param slots {import("vue").Slots} - The slots object
 * @param type {string} - 'field' or 'widget'
 * @param fieldName {string} - The field name
 * @returns {[string, string][]} - An array of slot names and the slot name without the prefix
 */
export const getSlotNamesFor = (slots, type, fieldName) => {
    const prefix = `${type}(${fieldName})`;
    const slotKeys = getPrefixedSlots(slots, prefix, ["help", "error", "message"]);

    if (type === "field") {
        const widgetPrefix = `widget(${fieldName})`;
        slotKeys.push(...getPrefixedSlots(slots, widgetPrefix, ["label"]));
    }

    const expandedPrefix = `${type}(${fieldName}__`;
    slotKeys.push(...getPrefixedSlots(slots, expandedPrefix, [], true));

    if (type === "field") {
        const expandedWidgetPrefix = `widget(${fieldName}__`;
        slotKeys.push(...getPrefixedSlots(slots, expandedWidgetPrefix, [], true));

        const headerPrefix = `header(${fieldName}__`;
        slotKeys.push(...getPrefixedSlots(slots, headerPrefix, [], true));

        // only add these if the more specific slots are not present
        if (!slots[`widget(${fieldName})toggle-button`]) {
            slotKeys.push(["fieldset-toggle-button", "toggle-button"]);
        }
        if (!slots[`widget(${fieldName})create-button`]) {
            slotKeys.push(["fieldset-create-button", "create-button"]);
        }
        if (!slots[`widget(${fieldName})destroy-button`]) {
            slotKeys.push(["fieldset-destroy-button", "destroy-button"]);
        }
    }

    // only return slots that have content based on outer slot name
    return slotKeys.filter(([slotName]) => slots[slotName]);
};
