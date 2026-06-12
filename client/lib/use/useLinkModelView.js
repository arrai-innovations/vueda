/**
 * @module use/useLinkModelView
 * @description Computes the href and navigation handler for a model-view link, disabling the action when a required primary key is absent.
 */
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { getActionName } from "@vueda/utils/actionMap.js";
import { computedAsync } from "@vueuse/core";
import { computed, toRef, unref } from "vue";
import { useRouter } from "vue-router";

/**
 * Computes a navigable href and disabled state for a model view action, disabling the link when a required PK is absent.
 *
 * @param {import('vue').UnwrapNestedRefs<{
 *     app: string,
 *     model: string,
 *     pk: string|string[]|undefined,
 *     view: string,
 * }>} props - The props.
 * @returns {{
 *     href: import('vue').ComputedRef<string|undefined>,
 *     navigate: () => Promise<void>,
 *     actionDisabled: import('vue').ComputedRef<boolean>,
 * }} The link model view state.
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
        return (workflow.transitions || []).some((t) => t.code === localActionName);
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
    /**
     * Navigate to the resolved route via the SPA router, mirroring vue-router's
     * RouterLink guard: a modified click (new tab/window, right click) or a
     * `target="_blank"` link is left to the browser, everything else has its
     * default `<a href>` navigation prevented in favour of `router.push`.
     *
     * @param {MouseEvent} [event] - The originating click event, when present.
     * @returns {Promise<void>}
     */
    const navigate = async (event) => {
        if (!toRoute.value) {
            return;
        }
        // Replicates vue-router's guardEvent: bail out for clicks the browser
        // should handle natively (modifier keys, non-left button, already
        // prevented, or links that open in a new context).
        if (event) {
            if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
                return;
            }
            if (event.defaultPrevented) {
                return;
            }
            if (event.button !== undefined && event.button !== 0) {
                return;
            }
            const target = event.currentTarget?.getAttribute?.("target");
            if (target && /\b_blank\b/i.test(target)) {
                return;
            }
            event.preventDefault();
        }
        await router.push(toRoute.value);
    };
    return {
        href,
        navigate,
        actionDisabled,
    };
};
