/**
 * @module theme/warnings
 * @description PrimeVue design token extensions and component pass-through overrides
 *   that add a "warning" visual state to form inputs.
 */

/**
 * PrimeVue component pass-through tokens for a single component's warning state.
 *
 * @typedef {object} ComponentWarningTokens
 * @property {{borderColor: string, placeholderColor: string}} warning - CSS variable references.
 * @property {function({dt: function}): string} css - CSS generator for the warning class.
 */

/**
 * Build warning-state pass-through tokens for a PrimeVue component.
 *
 * @param {string} component - The PrimeVue component CSS name (e.g. `"select"`, `"inputtext"`).
 * @returns {ComponentWarningTokens}
 * @private
 */
const warningForComponent = (component) => {
    return {
        warning: {
            borderColor: `{form.field.warning.border.color}`,
            placeholderColor: `{form.field.warning.placeholder.color}`,
        },
        css: ({ dt }) =>
            `
.p-warning.p-${component},
.p-warning .p-${component} {
    border-color: ${dt(component + ".warning.borderColor")};
}
.p-warning.p-${component}::placeholder,
.p-warning .p-${component}::placeholder {
    color: ${dt(component + ".warning.placeholderColor")};
}
`,
    };
};

/**
 * PrimeVue plugin config to extend the default theme with warning-state tokens.
 * Merge this into your `app.use(PrimeVue, { ... })` config.
 *
 * @type {{semantic: object, components: {[componentName: string]: ComponentWarningTokens}}}
 */
export const warningsPrimeVueConfig = {
    semantic: {
        extend: {
            colorScheme: {
                light: {
                    formField: {
                        warningBorderColor: "{amber.300}",
                        warningPlaceholderColor: "{amber.400}",
                    },
                },
                dark: {
                    formField: {
                        warningBorderColor: "{amber.300}",
                        warningPlaceholderColor: "{amber.400}",
                    },
                },
            },
        },
    },
    components: {
        select: warningForComponent("select"),
        inputtext: warningForComponent("inputtext"),
        datepicker: warningForComponent("datepicker"),
        textarea: warningForComponent("textarea"),
    },
};
