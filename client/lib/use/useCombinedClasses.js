import { useCombineClasses } from "@arrai-innovations/reactive-helpers";
import storeTheme from "@vueda/stores/storeTheme.js";
import { computed, reactive, toRef } from "vue";

/**
 * @typedef {*} Ref A Vue ref
 * @private
 */

/**
 * @typedef {string} CSSString A string representing a CSS class or a space-separated list of CSS classes.
 * @typedef {boolean|Ref<boolean>} CSSValue A truthy value or a reference to a truthy value, indicating whether to apply a CSS class, or unapply it if already applied.
 * @typedef {CSSString|CSSString[]} CSSClasses An array of CSS string(s) or a single CSS string.
 * @typedef {Object.<CSSString, CSSValue>} CSSObject A CSS object where keys are CSS classes and values are booleans indicating whether to apply the class.
 * @typedef {Array<CSSClasses, CSSObject>} CSSClassesOrObjects A mixed array containing multiple ways of specifying CSS classes.
 * @typedef {string} ComponentName The unique name of a component.
 * @typedef {string} VariantName The unique-per-component name of a variant.
 * @typedef {string} SpotName The unique-per-component name of a spot.
 * @typedef {object} ComponentConfig - The configuration for a component.
 * @property {string} defaultVariant The default variant to use for this component.
 * @property {Array<SpotName>} spots The spots available for this component.
 * @typedef {Object.<SpotName, CSSClasses>} VariantConfig - The configuration for a variant.
 * @typedef {Object.<VariantName, VariantConfig>} ComponentVariants - The configuration for all variants of a component.
 * @typedef {Object.<ComponentName, ComponentConfig>} ComponentsConfig - The configuration for all components.
 * @typedef {Object.<ComponentName, ComponentVariants>} ComponentsVariants - The configuration for all components and their variants.
 * @typedef {string} SpotClassName The name of the spot class as used in the props object.
 */

/**
 * Composition function for components to deal with spot classes from theme & props.
 * Newly registered spots are not reacted, so define all spots in the component config beforehand.
 * @param {ComponentName} componentName The name of the component for lookup in storeTheme.
 * @param {Object.<SpotClassName, CSSClassesOrObjects>} props The props object, containing variant and the individual spot class props.
 * @property {VariantName} props.variant The variant name.
 * @returns {Object.<SpotName, CSSObject>} An object containing the combined classes for each spot.
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
