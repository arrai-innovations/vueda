/**
 * @module use/useModelAction
 * @description Provides model-action target, copy, execution, dry-run, and redirect plumbing without rendering a form.
 */
import { useListInstance, useObjectInstance } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { getActionRequestMethod } from "@vueda/utils/actionMap.js";
import { getLowerTitle, getPluralizedTitle } from "@vueda/utils/case.js";
import { DETAIL_VIEW_CRUD_NAME, LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import {
    comparableLookupValue,
    hasCustomLookupField,
    lookupFieldOf,
    lookupValueOf,
} from "@vueda/utils/lookupValues.js";
import startCase from "lodash-es/startCase.js";
import { computed, reactive, ref, toRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * @typedef {object} ModelActionProps
 * @property {string} app - Django app label that owns the model.
 * @property {string} model - Django model name the action targets.
 * @property {string} action - Action identifier sent to the server.
 * @property {string|string[]|number|number[]} [pk] - The lookup value or lookup values of the objects that the action
 *  targets: the value of the model's lookup field (`lookupField` in model info), as the route carries it. One value
 *  targets one object through its detail URL. Several values target a bulk request. Without `pk`, the rows of
 *  `fetchState` are the targets.
 * @property {string} [actionVerboseName] - Human-readable action name.
 * @property {string} [actionSuccessSummary] - Toast summary shown on successful action completion.
 * @property {string} [actionErrorSummary] - Toast summary shown when the action fails.
 * @property {string} [confirmMessage] - Confirmation message shown to the user before submitting.
 * @property {import('@vueda/use/useModelAction.js').ModelActionFetchState} [fetchState] - The loaded rows that `pk`
 *  names, keyed by primary key. For a model whose lookup field is not its primary key field, a bulk request sends the
 *  loaded rows' primary keys.
 * @property {import('@arrai-innovations/reactive-helpers').ListManager|import('@arrai-innovations/reactive-helpers').ListInstance} [instanceList] -
 *  List instance that holds the selected objects. Bulk actions use it to reconcile displayed rows after a real destroy.
 *  Omit it to use a private transport-only list.
 * @property {(values: object) => object} [transformSubmitDataFn] - Optional form-value transform.
 * @property {(options?: ModelActionRunOptions) => Promise<any>} [runAction] - Host function that sends the action
 *  request in place of the default `runAction`. When it is set, `readyToDryRun` and `viewOnly` do not require a
 *  request method.
 * @property {string} [requestMethod] - HTTP method to use for a non-destroy action, chosen from the write methods
 *  that the action's `methodNames` in model info lists. When `methodNames` does not list it, the action has no
 *  request method. Without it, {@link getActionRequestMethod} chooses from `methodNames`. Destroy ignores this
 *  prop.
 * @property {boolean} [enableDryRun] - Whether to perform dry-run validation.
 * @property {"info"|"success"|"warning"|"danger"|"neutral"} [tone] - Sentiment tone.
 * @property {string} [bannerTitle] - Optional banner title.
 * @property {string} [bannerDescription] - Optional banner description.
 */

/**
 * @typedef {object} ModelActionFetchState
 * @property {boolean} [loading] - Whether the rows are loading.
 * @property {boolean} [errored] - Whether the request for the rows failed.
 * @property {object[]} [objectsInOrder] - The loaded rows in list order.
 * @property {Map<string, object>} [objectsMap] - The loaded rows by string primary key.
 */

/**
 * @typedef {object} ModelActionRunOptions
 * @property {object} [formValues] - Form values to submit.
 * @property {boolean} [dryRun] - Whether this is a dry-run validation request.
 * @property {string} [acknowledgeWarnings] - Warning digest acknowledged by the user.
 * @property {unknown[]} [pks] - The primary keys of the targeted objects. `ModelActionForm` passes them to a host
 *  `runAction`.
 */

/**
 * @typedef {object} ModelActionRawState
 *
 * Target state.
 * @property {import('vue').ComputedRef<unknown[]>} pks - Primary keys of the objects that the action targets. A bulk
 *  request sends them. They are the `pk` values when the model's lookup field is its primary key field. Otherwise
 *  they come from the loaded rows, and the list is empty until the rows load.
 * @property {import('vue').ComputedRef<string[]>} pksAsString - The primary keys as strings, for rendering.
 * @property {import('vue').ComputedRef<boolean>} bulk - Whether `pk` names more than one object.
 * @property {import('vue').ComputedRef<number>} pkCount - Number of objects that `pk` names.
 * @property {import('vue').ComputedRef<Map<string, object>>} objectsMap - Selected objects by string primary key.
 * @property {import('vue').ComputedRef<string[]>} missingLookupValues - The `pk` values that no loaded row holds, once
 *  `fetchState` has loaded without an error and before a real run starts. A row is missing when someone deleted it or
 *  changed its lookup value, or when the user may not read it. The action cannot run while any value is missing.
 * @property {import('vue').ComputedRef<string>} missingMessage - The message that names `missingLookupValues`. It is
 *  empty when no value is missing.
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
 *  (a target is present, dry-run is enabled, model info has loaded, and the action instance is idle). Model info gives
 *  the action's URL segment and request method, so the dry run waits for it. Carries no per-target memory of its
 *  own; pair it with `dryRunTarget` so the dry-run trigger latches per target instead of re-firing on every idle tick.
 * @property {import('vue').ComputedRef<string>} dryRunTarget - Identity of the app, model, action, and primary keys,
 *  for a consumer to key its own "already dry-ran this one" bookkeeping off of.
 *
 * Permission state.
 * @property {import('vue').ComputedRef<string|null>} requestMethod - The HTTP method that the action sends. It is
 *  always a write method that the action's `methodNames` in model info lists. For an action other than destroy, the
 *  `requestMethod` prop chooses among them. The value is `null` when there is no such method, which means that the
 *  user may not run the action. `readyToDryRun` and `runAction` require a method.
 * @property {import('vue').ComputedRef<boolean>} viewOnly - Whether model info has loaded, no host `runAction` is set,
 *  and the action has no request method to send. The user can view the records but cannot run the action.
 * @property {import('vue').ComputedRef<string>} viewOnlyMessage - The message that tells the user that only viewing is
 *  permitted and that the action cannot be executed.
 */

/**
 * @typedef {object} ModelActionContext
 * @property {import('@vueda/use/useModelConfig.js').ModelConfigState} modelConfig - Model metadata and view config.
 * @property {ModelActionRawState} state - Reactive action state.
 * @property {(options?: ModelActionRunOptions) => Promise<any>} runAction - Runs the action through the registered
 *  crud handlers. Rejects with `viewOnlyMessage` and sends no request when `requestMethod` is `null`. Rejects with
 *  `missingMessage` and sends no request while a `pk` value has no loaded row. Rejects and sends no request while
 *  `pks` is empty.
 * @property {(result: any) => Promise<boolean>} redirectTo - Redirects after success or cancel. Goes to the route's
 *  `returnPath` query value when it has one. Otherwise it goes to the model config's `actionRedirects` entry for
 *  the action. Resolves `false` when the router reports a navigation failure, so `useActionForm` keeps the form usable.
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

    // `pk` holds lookup values, which address objects. A bulk request and a host `runAction` identify each object by
    // its primary key. The route values are the primary keys when the lookup field is the primary key field.
    // Otherwise the loaded rows carry them. Without `pk`, the loaded rows are the targets.
    const pkKey = computed(() => modelConfig.info?.pk ?? "id");
    // The primary keys of the last real run. A dry run leaves them alone.
    const lastRunPks = ref([]);
    const loadedRows = computed(() =>
        props.fetchState?.objectsMap
            ? Array.from(props.fetchState.objectsMap.values())
            : (props.fetchState?.objectsInOrder ?? []),
    );
    const lookupValues = computed(() => {
        const values = normalizePks(props.pk);
        return values.length ? values : loadedRows.value.map((row) => lookupValueOf(modelConfig.info, row));
    });
    // A route value and a row's value can spell one key differently, such as a composite key `[1, 42]` against
    // `["1", "42"]`. `comparableLookupValue` gives both spellings one form, so a row matches the value that loaded it.
    const rowsByLookupValue = computed(
        () =>
            new Map(loadedRows.value.map((row) => [comparableLookupValue(lookupValueOf(modelConfig.info, row)), row])),
    );
    // The primary keys follow the order of the route values. Only a row that matches a route value is sent, so a
    // request never acts on a row that the route does not name.
    const pks = computed(() =>
        hasCustomLookupField(modelConfig.info)
            ? lookupValues.value
                  .map((value) => rowsByLookupValue.value.get(comparableLookupValue(value))?.[pkKey.value])
                  .filter((pk) => pk != null)
            : lookupValues.value,
    );
    const pksAsString = computed(() => pks.value.map(String));
    const objectsMap = computed(() => props.fetchState?.objectsMap || new Map());
    const bulk = computed(() => lookupValues.value.length > 1);
    const pkCount = computed(() => lookupValues.value.length);
    // The rows of a real run leave the list once the run succeeds, so the check stops when a real run starts.
    // A real run sets `lastRunPks`, and a change of target clears it.
    const missingLookupValues = computed(() => {
        if (
            !props.fetchState ||
            props.fetchState.loading !== false ||
            props.fetchState.errored ||
            lastRunPks.value.length > 0
        ) {
            return [];
        }
        return lookupValues.value
            .map(String)
            .filter((value) => !rowsByLookupValue.value.has(comparableLookupValue(value)));
    });
    const missingMessage = computed(() => {
        const missing = missingLookupValues.value;
        if (!missing.length) {
            return "";
        }
        return missing.length === 1
            ? `${missing[0]} was not found. It may have been deleted or renamed, or you may not have access to it.`
            : `${missing.join(", ")} were not found. They may have been deleted or renamed, or you may not have access ` +
                  "to them.";
    });

    // Bulk actions need a list instance so destroy can reconcile selected rows. Use the caller's list when provided;
    // otherwise create a private list only for transport. Single-object actions use an object instance owned here,
    // which sends the request to the object's detail URL, so it carries the lookup value.
    const target = reactive({ app: toRef(props, "app"), model: toRef(props, "model") });
    const fallbackInstanceList = props.instanceList
        ? undefined
        : useListInstance({ props: reactive({ target, pkKey, params: {} }) });
    const instanceList = props.instanceList ?? fallbackInstanceList;
    const instanceObject = useObjectInstance({
        props: reactive({
            target,
            pk: computed(() => lookupValues.value[0]),
            pkKey: computed(() => lookupFieldOf(modelConfig.info)),
            params: {},
        }),
    });
    const actionInstance = computed(() => (bulk.value ? instanceList : instanceObject));

    // The action's model info entry gives the URL segment that the router serves the action at, and the HTTP methods
    // that the action accepts. When model info reports no `urlPath`, the URL segment is the action name with dashes
    // turned into underscores, which is the router's default segment for an extra action.
    const actionInfo = computed(() => modelConfig.info?.actions?.find((action) => action.name === props.action));
    const urlPath = computed(() => actionInfo.value?.urlPath ?? props.action.replace(/-/g, "_"));
    // Destroy always sends `DELETE` through the delete handlers, so its method comes from model info alone. The default
    // request runs only when it has a method. A host that passes `runAction` sends the request itself.
    const isDestroy = computed(() => props.action === "destroy");
    const requestMethod = computed(() =>
        getActionRequestMethod(actionInfo.value?.methodNames, isDestroy.value ? undefined : props.requestMethod),
    );
    const viewOnly = computed(() => modelConfig.loading === false && !props.runAction && !requestMethod.value);

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

    const viewOnlyMessage = computed(
        () =>
            `Only viewing is permitted. You cannot ${actionVerboseNameLowerCase.value} ` +
            (bulk.value ? "these records." : "this record."),
    );

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

    // Dry-run readiness waits for a target, loaded model info, and an idle action instance. Model info gives the
    // action's URL segment and request method, so a dry run sent before it loads would go to the wrong URL or use the
    // wrong method. Readiness carries no per-target memory of its
    // own -- the dry run itself toggles instance loading, so without a latch somewhere the readiness watcher would
    // retrigger for the same target. `dryRunTarget` gives a consumer (`useActionForm`'s dry-run watcher) an identity
    // to latch against instead.
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
                modelConfig.loading === false &&
                !!(props.runAction || requestMethod.value) &&
                pks.value.length > 0 &&
                missingLookupValues.value.length === 0 &&
                !actionInstance.value?.state?.loading
            ),
    );

    // A redirect names the objects by the lookup values that `pk` holds. A successful bulk destroy clears the loaded
    // rows, and `pk` keeps the values.

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
            redirect = redirect({ bulk: bulk.value, result });
        }

        if (bulk.value || redirect === "list") {
            return !(await router.push({
                name: LIST_VIEW_CRUD_NAME,
                params: { app: props.app, model: props.model, action: "list" },
            }));
        }
        return !(await router.push({
            name: DETAIL_VIEW_CRUD_NAME,
            params: { app: props.app, model: props.model, action: redirect, pk: lookupValues.value[0] },
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
            if (!requestMethod.value) {
                throw new Error(viewOnlyMessage.value);
            }
            if (missingMessage.value) {
                throw new Error(missingMessage.value);
            }
            if (!pks.value.length) {
                throw new Error("The selected objects have not loaded.");
            }
            const instance = actionInstance.value;
            const runTarget = dryRunTarget.value;
            let cancelled = false;
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
                result = isDestroy.value
                    ? instance.bulkDelete({ ...shared, pks: runPks, keepObjects: dryRun })
                    : instance.executeAction({
                          ...shared,
                          action: props.action,
                          urlPath: urlPath.value,
                          pks: runPks,
                          requestMethod: requestMethod.value,
                      });
            } else {
                result = isDestroy.value
                    ? instance.delete({ ...shared, keepObject: dryRun })
                    : instance.executeAction({
                          ...shared,
                          action: props.action,
                          urlPath: urlPath.value,
                          requestMethod: requestMethod.value,
                      });
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
            missingLookupValues,
            missingMessage,
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
            requestMethod,
            viewOnly,
            viewOnlyMessage,
        },
        runAction,
        redirectTo,
    };
}
