import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import cloneDeep from "lodash-es/cloneDeep.js";

let defaultTheme = vuedaTailwind;

export function useTheme(componentName, props, keyFn) {
    return useComputedClasses(defaultTheme[componentName], props, keyFn);
}

export function getTheme() {
    return cloneDeep(defaultTheme);
}

export function setTheme(newTheme) {
    defaultTheme = cloneDeep(newTheme);
}

export function patchTheme(partialTheme) {
    const pt = cloneDeep(partialTheme);
    for (const componentName in pt) {
        defaultTheme[componentName] = {
            ...(defaultTheme[componentName] || {}),
            ...partialTheme[componentName],
        };
    }
}
