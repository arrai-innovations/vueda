/**
 * @module use/useModelAction
 * @description Provides model-action target, copy, execution, dry-run, and redirect plumbing without rendering a form.
 */
import { useListInstance, useObjectInstance } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { getLowerTitle, getPluralizedTitle } from "@vueda/utils/case.js";
import { DETAIL_VIEW_CRUD_NAME, LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import startCase from "lodash-es/startCase.js";
import { computed, reactive, ref, toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * @typedef {object} ModelActionProps
 * @property {string} app - Django app label that owns the model.
 * @property {string} model - Django model name the action targets.
 * @property {string} action - Action identifier sent to the server.
 * @property {string|string[]|number|number[]} [pk] - Optional primary key or primary keys when no fetch state is ready.
 * @property {string} [actionVerboseName] - Human-readable action name.
 * @property {string} [actionSuccessSummary] - Toast summary shown on successful action completion.
 * @property {string} [actionErrorSummary] - Toast summary shown when the action fails.
 * @property {string} [confirmMessage] - Confirmation message shown to the user before submitting.
 * @property {{ objectsInOrder?: object[], objectsMap?: Map<string, object> }} [fetchState] - Selected-object fetch state.
 * @property {import('@arrai-innovations/reactive-helpers').ListManager|import('@arrai-innovations/reactive-helpers').ListInstance} [instanceList] - List
 *  instance that holds the selected objects. Bulk actions use it to reconcile displayed rows after a real destroy.
 *  Omit it to use a private transport-only list.
 * @property {(values: object) => object} [transformSubmitDataFn] - Optional form-value transform.
 * @property {string} [requestMethod] - HTTP method used for non-destroy action requests.
 * @property {boolean} [enableDryRun] - Whether to perform dry-run validation.
 * @property {"info"|"success"|"warning"|"danger"|"neutral"} [tone] - Sentiment tone.
 * @property {string} [bannerTitle] - Optional banner title.
 * @property {string} [bannerDescription] - Optional banner description.
 */

/**
 * @typedef {object} ModelActionRunOptions
 * @property {object} [formValues] - Form values to submit.
 * @property {boolean} [dryRun] - Whether this is a dry-run validation request.
 * @property {string} [acknowledgeWarnings] - Warning digest acknowledged by the user.
 */

/**
 * @typedef {object} ModelActionRawState
 *
 * Target state.
 * @property {import('vue').ComputedRef<unknown[]>} pks - Primary keys targeted by the action.
 * @property {import('vue').ComputedRef<string[]>} pksAsString - String primary keys for rendering.
 * @property {import('vue').ComputedRef<boolean>} bulk - Whether more than one primary key is targeted.
 * @property {import('vue').ComputedRef<number>} pkCount - Number of primary keys targeted.
 * @property {import('vue').ComputedRef<Map<string, object>>} objectsMap - Selected objects by string primary key.
 *
 * Copy state.
 * @property {import('vue').ComputedRef<string>} modelVerboseName - Singular or plural model name.
 * @property {import('vue').ComputedRef<string>} actionVerboseNameLowerCase - Human-readable action label.
 * @property {import('vue').ComputedRef<string>} actionSuccessSummary - Success toast summary.
 * @property {import('vue').ComputedRef<string>} actionErrorSummary - Error toast summary.
 * @property {import('vue').ComputedRef<string>} confirmMessage - Confirmation prompt copy.
 * @property {import('vue').ComputedRef<string>} bannerTitle - Banner title.
 * @property {import('vue').ComputedRef<string>} bannerDescription - Banner description.
 * @property {import('vue').ComputedRef<string>} bannerIconName - Icon name for the current tone.
 * @property {import('vue').ComputedRef<boolean>} readyToDryRun - Whether the action can run a dry-run request right now
 *  (a target is present, dry-run is enabled, and the action instance is idle). Carries no per-target memory of its
 *  own; pair it with `dryRunTarget` so the dry-run trigger latches per target instead of re-firing on every idle tick.
 * @property {import('vue').ComputedRef<string>} dryRunTarget - Identity of the app, model, action, and primary keys, for a
 *  consumer to key its own "already dry-ran this one" bookkeeping off of.
 */

/**
 * @typedef {object} ModelActionContext
 * @property {import('@vueda/use/useModelConfig.js').ModelConfigState} modelConfig - Model metadata and view config.
 * @property {ModelActionRawState} state - Reactive action state.
 * @property {(options?: ModelActionRunOptions) => Promise<any>} runAction - Runs the action through the registered
 *  crud handlers.
 * @property {(result: any) => Promise<boolean>} redirectTo - Redirects after success or cancel. Resolves `false` when
 *  the router reports a navigation failure, so `useActionForm` keeps the form usable.
 */

/**
 * Normalizes a scalar, array, or empty primary key value into an array.
 *
 * @param {unknown|unknown[]} value - Raw primary key input.
 * @returns {unknown[]} Normalized primary keys.
 */
function normalizePks(value) {
    if (Array.isArray(value)) {
        return value.filter((pk) => pk !== undefined && pk !== null && pk !== "");
    }
    if (value === undefined || value === null || value === "") {
        return [];
    }
    return [value];
}

/**
 * Provides target, execution, copy, dry-run, and redirect plumbing for model actions.
 * It does not create or consume a form context; form shells layer `useActionForm`
 * or `ActionForm` on top when they need submit UI and validation summaries.
 *
 * @param {import('vue').UnwrapNestedRefs<ModelActionProps>} props - Reactive action configuration.
 * @returns {ModelActionContext}
 */
export function useModelAction(props) {
    const router = useRouter();
    const route = useRoute();
    const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

    const pks = computed(() => {
        const objectPks = props.fetchState?.objectsInOrder?.map((obj) => obj?.id ?? obj) || [];
        return objectPks.length > 0 ? objectPks : normalizePks(props.pk);
    });
    const pksAsString = computed(() => pks.value.map((pk) => pk.toString()));
    const objectsMap = computed(() => props.fetchState?.objectsMap || new Map());
    const bulk = computed(() => pks.value.length > 1);
    const pkCount = computed(() => pks.value.length);

    // Bulk actions need a list instance so destroy can reconcile selected rows. Use the caller's list when provided;
    // otherwise create a private list only for transport. Single-object actions use an object instance owned here.
    const pkKey = computed(() => modelConfig.info?.pk ?? "id");
    const target = reactive({ app: toRef(props, "app"), model: toRef(props, "model") });
    const fallbackInstanceList = props.instanceList
        ? undefined
        : useListInstance({ props: reactive({ target, pkKey, params: {} }) });
    const instanceList = props.instanceList ?? fallbackInstanceList;
    const instanceObject = useObjectInstance({
        props: reactive({
            target,
            pk: computed(() => pks.value[0]),
            pkKey,
            params: {},
        }),
    });
    const actionInstance = computed(() => (bulk.value ? instanceList : instanceObject));

    const modelVerboseName = computed(() =>
        bulk.value
            ? modelConfig.info?.verboseNamePlural || getLowerTitle(getPluralizedTitle(props.model))
            : modelConfig.info?.verboseName || getLowerTitle(props.model),
    );

    const actionVerboseNameLowerCase = computed(() =>
        props.actionVerboseName?.length > 0 ? props.actionVerboseName : getLowerTitle(props.action),
    );

    const actionSuccessSummary = computed(() => {
        if (props.actionSuccessSummary) {
            return props.actionSuccessSummary;
        }
        return startCase(`${actionVerboseNameLowerCase.value} ${modelVerboseName.value} successful`);
    });

    const actionErrorSummary = computed(() => {
        if (props.actionErrorSummary) {
            return props.actionErrorSummary;
        }
        return `Failed to ${props.action} ${props.model} `;
    });

    const confirmMessage = computed(() => {
        if (props.confirmMessage) {
            return props.confirmMessage;
        }
        return `Are you sure you want to ${actionVerboseNameLowerCase.value} the selected ${modelVerboseName.value}?`;
    });

    const bannerTitle = computed(() => {
        if (props.bannerTitle) {
            return props.bannerTitle;
        }
        return startCase(`${actionVerboseNameLowerCase.value} ${modelVerboseName.value}`);
    });

    const bannerDescription = computed(() => {
        if (props.bannerDescription) {
            return props.bannerDescription;
        }
        return "Review the selected records before continuing.";
    });

    const bannerIconName = computed(() => {
        switch (props.tone) {
            case "success":
                return "circleCheck";
            case "warning":
            case "danger":
                return "triangleExclamation";
            default:
                return "info";
        }
    });

    // Dry-run readiness waits for both a target and an idle action instance. It carries no per-target memory of its
    // own -- the dry run itself toggles instance loading, so without a latch somewhere the readiness watcher would
    // retrigger for the same target. `dryRunTarget` gives a consumer (`useActionForm`'s dry-run watcher) an identity
    // to latch against instead.
    const lastRunPks = ref([]);
    watch(
        () => JSON.stringify([props.app, props.model, props.action, props.pk]),
        () => {
            lastRunPks.value = [];
        },
    );
    const dryRunTarget = computed(() =>
        JSON.stringify([
            props.app,
            props.model,
            props.action,
            (pks.value.length ? pks.value : lastRunPks.value).map(String),
        ]),
    );
    const readyToDryRun = computed(
        () =>
            !!(
                props.app &&
                props.model &&
                props.action &&
                props.enableDryRun !== false &&
                pks.value.length > 0 &&
                !actionInstance.value?.state?.loading
            ),
    );

    // Keep the last real target for redirects because a successful bulk destroy may clear `pks` before redirecting.
    const redirectPks = computed(() => (lastRunPks.value.length > 0 ? lastRunPks.value : pks.value));
    const redirectBulk = computed(() => redirectPks.value.length > 1);

    const redirectTo = async (result) => {
        const returnPath = route.query?.returnPath;
        // `router.push` resolves a navigation failure instead of throwing when it does not navigate.
        if (returnPath && typeof returnPath === "string") {
            return !(await router.push(returnPath));
        }

        const redirects = modelConfig.config.actionRedirects || {};
        let redirect = redirects[props.action];
        if (redirect === undefined) {
            // A successful destroy removed the row, so no detail view of it can load. Cancel keeps the
            // default, because the row still exists.
            redirect = props.action === "destroy" && result === "success" ? "list" : redirects.default;
        }
        if (typeof redirect === "function") {
            redirect = redirect({ bulk: redirectBulk.value, result });
        }

        if (redirectBulk.value || redirect === "list") {
            return !(await router.push({
                name: LIST_VIEW_CRUD_NAME,
                params: { app: props.app, model: props.model, action: "list" },
            }));
        }
        return !(await router.push({
            name: DETAIL_VIEW_CRUD_NAME,
            params: { app: props.app, model: props.model, action: redirect, pk: redirectPks.value[0] },
        }));
    };

    /**
     * Runs the action through the selected list or object CRUD handler.
     *
     * Destroy uses `bulkDelete` or `delete`; every other action uses `executeAction`. Dry runs keep local state so
     * validation does not remove the rows or object being confirmed.
     *
     * @param {ModelActionRunOptions} [options={}] - The run options.
     * @returns {Promise<any>} The handler's result.
     * @throws {Error} The instance's stored error, when the action failed.
     */
    const runAction = ({ formValues = {}, dryRun = false, acknowledgeWarnings } = {}) => {
        try {
            const instance = actionInstance.value;
            const runTarget = dryRunTarget.value;
            let cancelled = false;
            const isDestroy = props.action === "destroy";
            const runPks = [...pks.value];
            const shared = {
                formData: props.transformSubmitDataFn ? props.transformSubmitDataFn(formValues) : undefined,
                dryRun,
                acknowledgeWarnings,
            };
            if (!dryRun) {
                lastRunPks.value = runPks;
            }

            let result;
            if (bulk.value) {
                result = isDestroy
                    ? instance.bulkDelete({ ...shared, pks: runPks, keepObjects: dryRun })
                    : instance.executeAction({
                          ...shared,
                          action: props.action,
                          pks: runPks,
                          requestMethod: props.requestMethod,
                      });
            } else {
                result = isDestroy
                    ? instance.delete({ ...shared, keepObject: dryRun })
                    : instance.executeAction({ ...shared, action: props.action, requestMethod: props.requestMethod });
            }

            const promise = Promise.resolve(result).then((response) => {
                if (cancelled || runTarget !== dryRunTarget.value) {
                    return response;
                }
                if (instance.state.errored) {
                    const error = instance.state.error;
                    // The form layer owns action errors, rather than the fetch error display.
                    instance.clearError();
                    throw error;
                }
                return response;
            });
            if (result?.cancel) {
                promise.cancel = (reason) => {
                    cancelled = true;
                    return result.cancel(reason);
                };
            }
            return promise;
        } catch (error) {
            return Promise.reject(error);
        }
    };

    return {
        modelConfig,
        state: {
            pks,
            pksAsString,
            bulk,
            pkCount,
            objectsMap,
            modelVerboseName,
            actionVerboseNameLowerCase,
            actionSuccessSummary,
            actionErrorSummary,
            confirmMessage,
            bannerTitle,
            bannerDescription,
            bannerIconName,
            readyToDryRun,
            dryRunTarget,
        },
        runAction,
        redirectTo,
    };
}
