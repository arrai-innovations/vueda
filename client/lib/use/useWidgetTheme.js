import { useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

export function useWidgetTheme(componentName, props, widgetContextState, additionalContext, keyFn) {
    const themeContext = reactive({
        required: toRef(widgetContextState, "required"),
        help: toRef(widgetContextState, "help"),
        invalid: toRef(widgetContextState.validationState, "invalid"),
        warning: toRef(widgetContextState.validationState, "warning"),
        ...additionalContext,
    });
    return useTheme(componentName, props, themeContext, keyFn);
}
