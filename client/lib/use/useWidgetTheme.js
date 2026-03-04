/**
 * @module use/useWidgetTheme
 * @description Resolves the active theme classes for a widget component by combining widget validation state with any additional context.
 */
import { useTheme } from "@vueda/use/useTheme.js";
import { computed, reactive } from "vue";

/**
 * Resolves the active theme function for a widget, combining validation state with any additional context.
 *
 * @param {string} componentName - The theme component name (must exist in the active theme).
 * @param {import('@vueda/use/useTheme.js').ThemeProps} props - The reactive or computed component props.
 * @param {import('@vueda/use/useWidget.js').WidgetContextState} widgetContextState - The widget context state.
 * @param {object} [additionalContext] - Extra reactive context entries to merge into the theme context.
 * @param {(key: string, kwargs: object) => string} [keyFn] - Optional function to modify a key based on kwargs.
 * @returns {import('@vueda/use/useTheme.js').UseThemeReturnFunction}
 */
export function useWidgetTheme(componentName, props, widgetContextState, additionalContext, keyFn) {
    const themeContext = reactive({
        required: computed(() => widgetContextState?.required),
        help: computed(() => widgetContextState?.help),
        invalid: computed(() => widgetContextState?.validationState?.invalid),
        warning: computed(() => widgetContextState?.validationState?.warning),
        ...additionalContext,
    });
    return useTheme(componentName, props, themeContext, keyFn);
}
