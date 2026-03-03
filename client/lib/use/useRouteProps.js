/**
 * @module use/useRouteProps
 * @description Returns a computed ref of the resolved route props for the first matched route, supporting both object and function prop definitions.
 */
import isFunction from "lodash-es/isFunction.js";
import { computed } from "vue";
import { useRoute } from "vue-router";

export function useRouteProps() {
    const route = useRoute();

    return computed(() => {
        const matched = route.matched?.[0];
        const props = matched?.props?.default;

        return isFunction(props) ? props(route) : props;
    });
}
