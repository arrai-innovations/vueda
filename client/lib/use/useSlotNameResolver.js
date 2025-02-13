import { computed, reactive } from "vue";
import { useSlots } from "vue";
import { deepUnref } from "vue-deepunref";

/**
 * @typedef {object} ResolvedSlotRawName
 * @property {import('vue').ComputedRef<boolean>} exists - Whether any passed slots will match any of the slot names.
 * @property {import('vue').ComputedRef<string|undefined>} name - The name of the most specific slot that was passed.
 * @example
 * ```vue
 * <script setup>
 * import { useSlotNameResolver } from '@vueda/use/useSlotNameResolver.js';
 *
 * // some reactive/dynamic logic
 * const myFieldName = computed(() => 'myField');
 * const mySlotsNames = computed(() => ([
 *   `field(${unref(myFieldName)})mySlot`, `field-mySlot`, 'mySlot'
 * ]));
 * const mySlot = useSlotNameResolver(mySlotsNames);
 * </script>
 * <template>
 *     ...
 *     <!-- translate outside slot names to mySlot -->
 *     <some-sub-component>
 *       <template name="mySlot">
 *         <slot v-if="mySlot.exists" :name="mySlot.name" />
 *       </template>
 *     </some-sub-component>
 *     ...
 * </template>
 * ```
 */

/**
 * @typedef {
 *     string[]|
 *     import('vue').Ref<string[]>|
 *     import('vue').Ref<import('vue').Ref<string>[]>|
 *     import('vue').Ref<string>[]
 * } SlotNamesInOrderOfPrecedence - The slot names to check for, in order of precedence.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<ResolvedSlotRawName>} ResolvedSlotName - The resolved slot name instance.
 */

/**
 * Helper to resolve the most specific slot name from a list of candidates in order of precedence.
 *
 * @param {SlotNamesInOrderOfPrecedence} slotNamesInOrderOfPrecedence - The slot names to check for, in order of
 *  precedence.
 * @param {import('vue').Slots|undefined} slots - The slots object to check against. If not provided, the current
 *  instance's slots will be used.
 * @returns {ResolvedSlotName} - The resolved slot name.
 */
export function useSlotNameResolver(slotNamesInOrderOfPrecedence, slots) {
    if (!slots) {
        slots = useSlots();
    }
    const possibleNames = computed(() => deepUnref(slotNamesInOrderOfPrecedence));
    const exists = computed(() => possibleNames.value.some((slotName) => !!slots[slotName]));
    const name = computed(() => possibleNames.value.find((slotName) => slots[slotName]));
    return reactive({ exists, name, possibleNames });
}
