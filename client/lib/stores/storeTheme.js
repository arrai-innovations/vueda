import { defineStore } from "pinia";

/**
 * @typedef {string} CSSString A string representing a CSS class or a space-separated list of CSS classes.
 * @typedef {CSSString|CSSString[]} CSSClasses An array of CSS string(s) or a single CSS string.
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
 */

/**
 * Validates the component configuration.
 * @param store
 * @param {ComponentName} componentName
 * @param {ComponentConfig} componentConfig
 * @throws {Error} If the component configuration is invalid.
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
 * @param store
 * @param {ComponentName} componentName
 * @param {VariantConfig} variantConfig
 * @throws {Error} If the variant configuration is invalid.
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
 */
function clearVariant(componentName, variantName) {
    delete this.variants?.[componentName]?.[variantName];
}

/**
 * Clears all components and variants.
 * @returns {void}
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
 * @name storeTheme
 * @property {ComponentsConfig} components - The configuration for all components.
 * @property {ComponentsVariants} variants - The configuration for all components and their variants.
 * @property {function} registerComponent - Registers a new component with the given name.
 * @property {function} registerVariant - Registers a new variant for a component with the given name.
 * @property {function} clearComponent - Clears a component with the given name.
 * @property {function} clearVariant - Clears a variant for a component with the given name.
 * @property {function} clearAll - Clears all components and variants.
 */
export default defineStore({
    id: "themeStore",
    state: () => ({
        /**
         * @type {ComponentsConfig}
         */
        components: {},
        /**
         * @type {ComponentsVariants}
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
