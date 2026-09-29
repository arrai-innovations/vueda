/**
 * @module stores/storeTheme
 * @description Pinia store for registering and managing UI component theme variants and their spot configurations.
 */
import { defineStore } from "pinia";

/**
 * @typedef {string} ComponentName The unique name of a component.
 */

/**
 * @typedef {string} VariantName The unique-per-component name of a variant.
 */

/**
 * @typedef {string} SpotName The unique-per-component name of a spot.
 */

/**
 * @typedef {{
 *     defaultVariant: VariantName,
 *     spots: SpotName[],
 * }} ComponentConfig The configuration for a component.
 */

/**
 * @typedef {{
 *     [spotClassName: string]: import('@arrai-innovations/reactive-helpers').CSSClasses
 * }} VariantConfig The configuration for a variant.
 */

/**
 * The theme store's state: registered components and their variants.
 *
 * The standalone actions below type `this` with it. Typing them with `ThemeStore` would make the
 * store's type refer to itself, and TypeScript would then infer `storeTheme` as `any`.
 *
 * @typedef {{
 *     components: {[key: ComponentName]: ComponentConfig},
 *     variants: {[key: ComponentName]: {[key: VariantName]: VariantConfig}},
 * }} ThemeState
 */

/**
 * The theme store.
 *
 * @typedef {ReturnType<typeof storeTheme>} ThemeStore
 */

/**
 * Validates the component configuration.
 *
 * @param {ThemeState} store - The store to validate against.
 * @param {ComponentName} componentName - The name of the component.
 * @param {ComponentConfig} componentConfig - The configuration for the component.
 * @private
 */
const validateComponentConfig = (store, componentName, componentConfig) => {
    // component must define a default variant
    if (!componentConfig.defaultVariant) {
        throw new Error(`Component ${componentName} must define a default variant`);
    }
    // component must define spots
    if (!componentConfig.spots) {
        throw new Error(`Component ${componentName} must define spots`);
    }
};

/**
 * Validates the variant configuration.
 * @param {ThemeState} store
 * @param {ComponentName} componentName
 * @param {VariantConfig} variantConfig
 * @private
 */
const validateVariantConfig = (store, componentName, variantConfig) => {
    const componentConfig = store.components[componentName];
    if (!componentConfig) {
        throw new Error(`Component ${componentName} is not registered`);
    }
    // variant must define spots that are available in the component config
    const unknownSpots = Object.keys(variantConfig).filter((spot) => !componentConfig.spots.includes(spot));
    if (unknownSpots.length) {
        throw new Error(`Component ${componentName} has unknown spots: ${unknownSpots.join(", ")}`);
    }
};

/**
 * Registers a new component with the given name.
 * @param {ComponentName} componentName - The name of the component.
 * @param {ComponentConfig} componentConfig - The default variant and spot names for the component.
 * @throws {Error} If the component configuration is invalid.
 * @this {ThemeState}
 * @returns {void}
 */
function registerComponent(componentName, componentConfig) {
    validateComponentConfig(this, componentName, componentConfig);
    this.components[componentName] = componentConfig;
}

/**
 * Registers a new variant for a component with the given name.
 * @param {ComponentName} componentName - The name of a registered component.
 * @param {VariantName} variantName - The name of the variant.
 * @param {VariantConfig} variantConfig - CSS classes keyed by spot name. Each spot must be one the component declares.
 * @throws {Error} If the variant configuration is invalid.
 * @this {ThemeState}
 * @returns {void}
 */
function registerVariant(componentName, variantName, variantConfig) {
    validateVariantConfig(this, componentName, variantConfig);
    if (!this.variants[componentName]) {
        this.variants[componentName] = {};
    }
    this.variants[componentName][variantName] = variantConfig;
}

/**
 * Clears a component with the given name.
 * @param {ComponentName} componentName - The name of the component to remove, along with its variants.
 * @returns {void}
 * @this {ThemeState}
 */
function clearComponent(componentName) {
    delete this.components[componentName];
    delete this.variants[componentName];
}

/**
 * Clears a variant for a component with the given name.
 * @param {ComponentName} componentName - The name of the component.
 * @param {VariantName} variantName - The name of the variant to remove.
 * @returns {void}
 * @this {ThemeState}
 */
function clearVariant(componentName, variantName) {
    delete this.variants?.[componentName]?.[variantName];
}

/**
 * Clears all components and variants.
 * @returns {void}
 * @this {ThemeState}
 */
function clearAll() {
    // remove keys from components and variants, instead of assigning empty objects
    for (const key of Object.keys(this.components)) {
        delete this.components[key];
    }
    for (const key of Object.keys(this.variants)) {
        delete this.variants[key];
    }
}

/**
 * The store for managing the theme.
 */
export const storeTheme = defineStore("theme", {
    state: () => ({
        /**
         * Registered component configurations keyed by component name.
         *
         * @type {{[componentName: ComponentName]: ComponentConfig}}
         */
        components: {},
        /**
         * Registered variant configurations keyed by component name, then by variant name.
         *
         * @type {{[componentName: ComponentName]: {[variantName: VariantName]: VariantConfig}}}
         */
        variants: {},
    }),
    actions: {
        registerComponent,
        registerVariant,
        clearComponent,
        clearVariant,
        clearAll,
    },
});
