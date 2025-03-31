import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { getActionName } from "@vueda/utils/actionMap.js";
import { computedAsync } from "@vueuse/core";
import { computed, toRef, unref } from "vue";
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
    const workflow = useWorkflowTransitions(toRef(props, "app"), toRef(props, "model"));
    const actionName = computed(() => getActionName(props.view));
    const requiresPK = computed(() => {
        const localActionName = unref(actionName);
        // Check action details
        for (const [key, details] of Object.entries(modelConfig.config?.actionDetails || {})) {
            if (key === localActionName && (details.detail || details.bulk)) {
                return true;
            }
        }
        // Check workflow transitions
        return (workflow.transitions || []).some((t) => t.name === localActionName);
    });

    const pkValid = computed(() => {
        const localRequiresPK = unref(requiresPK);
        return (localRequiresPK && props.pk) || !localRequiresPK;
    });
    const toRouteArgs = computedAsync(async () => {
        return unref(pkValid) && props.view
            ? await getCRUDForTo({
                  app: props.app,
                  model: props.model,
                  pk: requiresPK.value && props.pk ? props.pk : undefined,
                  view: props.view,
                  query: props.query,
              })
            : undefined;
    });
    const actionDisabled = computed(() => {
        if (props.disabled) {
            return true;
        }
        const needsPK = unref(requiresPK);
        const pk = props.pk;
        const missingPK = pk === undefined || pk === null || (Array.isArray(pk) && pk.length === 0);
        return needsPK && missingPK;
    });

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
