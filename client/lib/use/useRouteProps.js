/**
 * @module use/useRouteProps
 * @description Returns a computed ref of the resolved route props for the first matched route, supporting both object and function prop definitions.
 */
import isFunction from "lodash-es/isFunction.js";
import { computed } from "vue";
import { useRoute } from "vue-router";

/**
 * Returns a computed ref containing the resolved props for the first matched route.
 * Supports both object and function prop definitions.
 *
 * @returns {import('vue').ComputedRef<object|undefined>} A computed ref of the resolved route props.
 */
export function useRouteProps() {
    const route = useRoute();

    return computed(() => {
        const matched = route.matched?.[0];
        const props = matched?.props?.default;

        return isFunction(props) ? props(route) : props;
    });
}
