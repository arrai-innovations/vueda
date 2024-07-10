import { useCombineClasses } from "@arrai-innovations/reactive-helpers";
import { storeTheme } from "@vueda/stores/storeTheme.js";
import { computed, reactive, toRef } from "vue";

/**
 * @typedef {import('vue').UnwrapNestedRefs<{
 *     [spotClassName: string]: import('vue').Ref<
 *         string |
 *         string[] |
 *         string[][] |
 *         { [classnames: string]: boolean | import('vue').Ref<boolean> } |
 *         { [classnames: string]: boolean | import('vue').Ref<boolean> }[]
 *     >
 * }>} CombinedClassesProps
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<{
 *     [spotClassName: string]: import('vue').Ref<
 *         import('@arrai-innovations/reactive-helpers').CombinedClasses
 *     >
 * }>} CombinedClassesInstance
 */

/**
 * A composition function for components to deal with spot classes from theme & props.
 *
 * @param {string} componentName - The name of the component for lookup in storeTheme.
 * @param {CombinedClassesProps} props - The props object, containing variant and the
 *  individual spot class props.
 * @returns {CombinedClassesInstance} The combined classes for each spot.
 */
export function useCombinedClasses(componentName, props) {
    const themeStore = storeTheme();
    const combinedClasses = reactive({});
    const componentConfig = computed(() => themeStore.components[componentName]);
    const variantConfig = computed(() => themeStore.variants[componentName]?.[props.variant]);
    const defaultVariant = computed(() => componentConfig.value?.defaultVariant);
    const defaultVariantConfig = computed(() => themeStore.variants[componentName]?.[defaultVariant.value]);

    if (!componentConfig.value) {
        throw new Error(`Component ${componentName} is not registered`);
    }
    for (const spot of componentConfig.value.spots) {
        const spotClassName = `${spot}Class`;
        combinedClasses[spotClassName] = useCombineClasses(
            computed(() => defaultVariantConfig.value?.[spot]),
            computed(() => variantConfig.value?.[spot]),
            toRef(props, spotClassName),
        );
    }

    return combinedClasses;
}
