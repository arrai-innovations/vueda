import { useTheme } from "@vueda/use/useTheme.js";
import { reactive, useAttrs } from "vue";

export function useWidgetTheme(componentName, props, widgetContextState, keyFn) {
    const attrs = useAttrs();
    const themeContext = reactive({
        props,
        attrs,
        widgetContextState,
    });
    return useTheme(componentName, props, themeContext, keyFn);
}
