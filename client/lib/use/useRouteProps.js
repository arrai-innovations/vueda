import isFunction from "lodash-es/isFunction.js";
import { computed } from "vue";
import { useRoute } from "vue-router";

export function useRouteProps() {
    const route = useRoute();

    return computed(() => {
        return isFunction(route.matched?.[0].props.default)
            ? route.matched?.[0].props.default(route)
            : route.matched?.[0].props.default;
    });
}
