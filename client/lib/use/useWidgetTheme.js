/**
 * @module use/useWidgetTheme
 * @description Resolves the active theme classes for a widget component by combining widget validation state with any additional context.
 */
import { useTheme } from "@vueda/use/useTheme.js";
import { computed, reactive } from "vue";

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
