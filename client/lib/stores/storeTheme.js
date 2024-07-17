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
 * The theme store.
 *
 * @typedef {import('pinia').Store<
 *     'themeStore',
 *     {
 *         components: {
 *             [key: ComponentName]: ComponentConfig
 *         },
 *         variants: {
 *             [key: ComponentName]: {
 *                 [key: VariantName]: VariantConfig
 *             }
 *         },
 *     },
 *     {},
 *     {
 *         registerComponent: (componentName: ComponentName, componentConfig: ComponentConfig) => void,
 *         registerVariant: (componentName: ComponentName, variantName: VariantName, variantConfig: VariantConfig) => void,
 *         clearComponent: (componentName: ComponentName) => void,
 *         clearVariant: (componentName: ComponentName, variantName: VariantName) => void,
 *         clearAll: () => void,
 *     }
 * >} ThemeStore
 */

/**
 * Validates the component configuration.
 *
 * @param {ThemeStore} store - The store to validate against.
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
 * @param {ThemeStore} store
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
 * @param {ComponentName} componentName
 * @param {ComponentConfig} componentConfig
 * @throws {Error} If the component configuration is invalid.
 * @this {ThemeStore}
 * @returns {void}
 */
function registerComponent(componentName, componentConfig) {
    validateComponentConfig(this, componentName, componentConfig);
    this.components[componentName] = componentConfig;
}

/**
 * Registers a new variant for a component with the given name.
 * @param {ComponentName} componentName
 * @param {VariantName} variantName
 * @param {VariantConfig} variantConfig
 * @throws {Error} If the variant configuration is invalid.
 * @this {ThemeStore}
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
 * @param {ComponentName} componentName
 * @returns {void}
 * @this {ThemeStore}
 */
function clearComponent(componentName) {
    delete this.components[componentName];
    delete this.variants[componentName];
}

/**
 * Clears a variant for a component with the given name.
 * @param {ComponentName} componentName
 * @param {VariantName} variantName
 * @returns {void}
 * @this {ThemeStore}
 */
function clearVariant(componentName, variantName) {
    delete this.variants?.[componentName]?.[variantName];
}

/**
 * Clears all components and variants.
 * @returns {void}
 * @this {ThemeStore}
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
 *
 * @returns {ThemeStore} The theme store.
 */
export const storeTheme = defineStore({
    id: "theme",
    state: () => ({
        components: {},
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
