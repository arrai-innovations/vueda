import { getSlotNamesFor } from "@vueda/utils/rendererSupport.js";
import { computed, reactive, readonly, unref } from "vue";

/**
 * @typedef {object} ResolvedSlotGroupsRaw
 * @property {import('vue').ComputedRef<{[groupPrefix: string]: [string, string][]}>} grouped - The grouped slot names.
 * @property {import('vue').ComputedRef<string[]>} remaining - The remaining slot names.
 * @property {([groupPrefix: string]) => boolean} hasGrouped - Whether the grouped slot names contain any slots.
 */

/**
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<ResolvedSlotGroupsRaw>>} ResolvedSlotGroups
 */

/**
 * @param {{[slotName: string]: any}} slots - The slot names to check for.
 * @param {import('vue').Ref<string>|string} fieldName - The field name to check for.
 * @param {import('vue').Ref<string[]>|string[]} groupPrefixes - The groupPrefixes of the slot name.
 * @returns {ResolvedSlotGroups}
 */
export function useSlotNameGrouper(slots, fieldName, groupPrefixes) {
    const knownTuples = computed(() =>
        unref(groupPrefixes).flatMap((type) => getSlotNamesFor(slots, type, unref(fieldName))),
    );
    const grouped = computed(() => {
        const out = {};
        for (const [outer, inner] of unref(knownTuples)) {
            const groupPrefix = outer.slice(0, outer.indexOf("("));
            (out[groupPrefix] ||= []).push([outer, inner]);
        }
        return out;
    });

    const knownNames = computed(() => unref(knownTuples).map(([outer]) => outer));
    const remaining = computed(() => Object.keys(slots).filter((slot) => !unref(knownNames).includes(slot)));

    return readonly(
        reactive({
            grouped,
            remaining,
            hasGrouped: (groupPrefix) => !!unref(grouped)?.[groupPrefix]?.length,
        }),
    );
}
