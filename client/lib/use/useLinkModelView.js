/**
 * @module use/useLinkModelView
 * @description Picks the first view in a model-view link that the viewer can open, and computes its href and navigation handler.
 */
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { getActionName } from "@vueda/utils/actionMap.js";
import { computedAsync } from "@vueuse/core";
import { computed, toRef } from "vue";
import { useRouter } from "vue-router";

/**
 * Computes the target view, href, and disabled state for a link to a model view.
 *
 * `view` names one view or an ordered list of views. A view is available when the target model's
 * `actionDetails` or its workflow transitions include the view's action. `getActionName` maps a view
 * name such as `read` to its action name, `retrieve`. Model info lists an action only when the
 * viewer passes its model-level permission check, so this decides what the viewer sees. The server
 * and the route guards still enforce access on the linked page.
 *
 * The link targets the first view that is available and resolves to a route. A view that needs a
 * primary key resolves only when `pk` is set. `linkable` is true when such a view exists. While the
 * target model's info loads, and after it fails to load, no view is available, so `linkable` is
 * false. When no view is linkable, the target is the first view in the list, so a button keeps
 * its href and disabled state.
 *
 * @param {import('vue').UnwrapNestedRefs<{
 *     app: string,
 *     model: string,
 *     pk: string|string[]|undefined,
 *     view: string|string[],
 * }>} props - The props.
 * @returns {{
 *     view: import('vue').ComputedRef<string|undefined>,
 *     linkable: import('vue').ComputedRef<boolean>,
 *     href: import('vue').ComputedRef<string|undefined>,
 *     navigate: () => Promise<void>,
 *     actionDisabled: import('vue').ComputedRef<boolean>,
 *     actionDetail: import('vue').ComputedRef<import('@vueda/stores/storeModelInfo.js').ActionInfo|undefined>,
 * }} The link model view state.
 */
export const useLinkModelView = (props) => {
    const views = computed(() => (Array.isArray(props.view) ? props.view : [props.view]).filter(Boolean));
    // The model config is built for the first view in the list, which is the preferred target.
    const modelConfig = useModelConfig(
        toRef(props, "app"),
        toRef(props, "model"),
        computed(() => views.value[0]),
    );
    const workflow = useWorkflowTransitions(toRef(props, "app"), toRef(props, "model"));

    const actionDetails = computed(() => modelConfig.config?.actionDetails || {});
    const transitionCodes = computed(() => new Set((workflow.transitions || []).map((t) => t.code)));

    const requiresPK = (view) => {
        const actionName = getActionName(view);
        const details = actionDetails.value[actionName];
        return Boolean(details?.detail || details?.bulk) || transitionCodes.value.has(actionName);
    };
    const isAvailable = (view) => {
        if (modelConfig.loading || modelConfig.errored) {
            return false;
        }
        const actionName = getActionName(view);
        return Object.hasOwn(actionDetails.value, actionName) || transitionCodes.value.has(actionName);
    };

    const router = useRouter();
    // One entry per view in the list: the view, whether it is available, and its resolved route when
    // it has one. Availability and the route come from the same model info, so a view becomes
    // linkable only together with the route that its primary key requirement produces. Every
    // reactive read happens before the first await, so computedAsync tracks each value that the
    // entries depend on, including the items of a pk array.
    const candidates = computedAsync(async () => {
        const pending = views.value.map((view) => {
            const needsPK = requiresPK(view);
            const to =
                !needsPK || props.pk
                    ? getCRUDForTo({
                          app: props.app,
                          model: props.model,
                          pk: needsPK ? props.pk : undefined,
                          view,
                          query: props.query,
                      })
                    : undefined;
            return { view, available: isAvailable(view), to };
        });
        return Promise.all(
            pending.map(async ({ view, available, to }) => {
                const location = await to;
                return {
                    view,
                    available,
                    route: router.hasRoute(location?.name) ? router.resolve(location) : undefined,
                };
            }),
        );
    }, []);
    const linkTarget = computed(() => candidates.value.find((c) => c.route && c.available));
    const target = computed(() => linkTarget.value ?? candidates.value[0]);

    const view = computed(() => target.value?.view ?? views.value[0]);
    const linkable = computed(() => Boolean(linkTarget.value));
    // The target action's metadata, used to derive its intrinsic Button tone (a delete/destroy
    // action is destructive). Keyed by the action name, so a view name like "read" resolves the
    // metadata for "retrieve".
    const actionDetail = computed(() => (view.value ? actionDetails.value[getActionName(view.value)] : undefined));
    const actionDisabled = computed(() => {
        if (props.disabled) {
            return true;
        }
        const pk = props.pk;
        const missingPK = pk === undefined || pk === null || (Array.isArray(pk) && pk.length === 0);
        return Boolean(view.value) && requiresPK(view.value) && missingPK;
    });

    const toRoute = computed(() => target.value?.route);
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
        view,
        linkable,
        href,
        navigate,
        actionDisabled,
        actionDetail,
    };
};
