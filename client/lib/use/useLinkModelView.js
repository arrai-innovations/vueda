import { getCRUDForTo, isDetailView } from "@vueda/router/getCrud.js";
import { computed } from "vue";
import { useRouter } from "vue-router";

/**
 * @params {import('vue').UnwrapRef<{
 *     app: string,
 *     model: string,
 *     pk: string|string[]|undefined,
 *     view: string,
 * }>} props - The props.
 * @returns {{
 *     href: import('vue').ComputedRef<string|undefined>,
 *     navigate: () => Promise<void>,
 *     actionDisabled: import('vue').ComputedRef<boolean>,
 * }} The link model view.
 */
export const useLinkModelView = (props) => {
    const isDetailViewComputed = computed(() => isDetailView(props.view));

    const pkValid = computed(() => (isDetailViewComputed.value && props.pk) || !isDetailViewComputed.value);
    const toRouteArgs = computed(() => {
        return pkValid.value && props.view
            ? getCRUDForTo({
                  app: props.app,
                  model: props.model,
                  pk: (isDetailViewComputed.value && props.pk) || undefined,
                  view: props.view,
              })
            : undefined;
    });
    const actionDisabled = computed(
        () => isDetailViewComputed.value && (!props.pk || (Array.isArray(props.pk) && props.pk.length === 0)),
    );
    const router = useRouter();
    const toRoute = computed(() =>
        router.hasRoute(toRouteArgs.value?.name) ? router.resolve(toRouteArgs.value) : undefined,
    );
    const href = computed(() => {
        return toRoute.value?.href;
    });
    const navigate = async () => {
        if (!toRoute.value) {
            return;
        }
        await router.push(toRoute.value);
    };
    return {
        href,
        navigate,
        actionDisabled,
    };
};
