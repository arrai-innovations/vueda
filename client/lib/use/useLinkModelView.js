import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { getActionName } from "@vueda/use/useActionMap.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { computedAsync } from "@vueuse/core";
import { computed, toRef } from "vue";
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
    const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), toRef(props, "view"));
    const actionName = computed(() => getActionName(props.view));
    const requiresPK = computed(
        () =>
            Object.entries(modelConfig.config?.actionDetails || {}).some(
                ([n, d]) => n === actionName.value && (d.detail || d.bulk),
            ) || actionName.value === "transition",
    );
    const pkValid = computed(() => (requiresPK.value && props.pk) || !requiresPK.value);
    const toRouteArgs = computedAsync(async () => {
        return pkValid.value && props.view
            ? await getCRUDForTo({
                  app: props.app,
                  model: props.model,
                  pk: requiresPK.value && props.pk ? props.pk : undefined,
                  view: props.view,
                  query: props.query,
              })
            : undefined;
    });
    const actionDisabled = computed(
        () => props.disabled || (requiresPK.value && (!props.pk || (Array.isArray(props.pk) && props.pk.length === 0))),
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
