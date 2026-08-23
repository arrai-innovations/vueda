/**
 * @module use/useModelAction
 * @description Provides model-action target, copy, request, dry-run, and redirect plumbing without rendering a form.
 */
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { getLowerTitle, getPluralizedTitle } from "@vueda/utils/case.js";
import { DETAIL_VIEW_CRUD_NAME, LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { ConfirmationRequiredError, FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
import { getDetailUrl, getListUrl } from "@vueda/utils/urls.js";
import startCase from "lodash-es/startCase.js";
import { computed, toRef, unref } from "vue";
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
 * @typedef {object} ModelActionRequest
 * @property {string} url - Request URL.
 * @property {object} options - Fetch options.
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
 * @property {import('vue').ComputedRef<boolean>} readyToDryRun - Whether the action can run a dry-run request.
 */

/**
 * @typedef {object} ModelActionContext
 * @property {import('@vueda/use/useModelConfig.js').ModelConfigState} modelConfig - Model metadata and view config.
 * @property {ModelActionRawState} state - Reactive action state.
 * @property {(options?: ModelActionRunOptions) => ModelActionRequest} buildRequest - Builds the request without sending it.
 * @property {(options?: ModelActionRunOptions) => Promise<any>} runAction - Sends the action request.
 * @property {(result: any) => Promise<void>} redirectTo - Redirects after success or cancel.
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
 * Provides target, request, copy, dry-run, and redirect plumbing for model actions.
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

    const readyToDryRun = computed(
        () => !!(props.app && props.model && props.action && props.enableDryRun !== false && pks.value.length > 0),
    );

    const redirectTo = async (result) => {
        const returnPath = route.query?.returnPath;
        if (returnPath && typeof returnPath === "string") {
            await router.push(returnPath);
            return;
        }

        const redirects = modelConfig.config.actionRedirects || {};
        let redirect = redirects[props.action];
        if (redirect === undefined) {
            redirect = redirects.default;
        }
        if (typeof redirect === "function") {
            redirect = redirect({ bulk: bulk.value, result });
        }

        if (bulk.value || redirect === "list") {
            await router.push({
                name: LIST_VIEW_CRUD_NAME,
                params: { app: props.app, model: props.model, action: "list" },
            });
        } else {
            await router.push({
                name: DETAIL_VIEW_CRUD_NAME,
                params: { app: props.app, model: props.model, action: redirect, pk: pks.value[0] },
            });
        }
    };

    const buildRequest = ({ formValues = {}, dryRun, acknowledgeWarnings } = {}) => {
        const isDestroy = props.action === "destroy";
        const headers = {
            "X-CSRFToken": getCSRFValue(),
            "Content-Type": "application/json",
        };
        if (dryRun) {
            headers["Dry-Run"] = "true";
        }
        if (acknowledgeWarnings) {
            headers["Acknowledge-Warnings"] = acknowledgeWarnings;
        }

        const formData = props.transformSubmitDataFn ? props.transformSubmitDataFn(formValues) : undefined;
        const body = (() => {
            if (bulk.value) {
                return JSON.stringify({ pks: unref(pks), ...(formData || {}) });
            }
            return formData ? JSON.stringify(formData) : undefined;
        })();

        // Destroy is a standard viewset method, not an extra action, so it has no action
        // segment: the server routes bulk destroy to the list url and single destroy to the
        // detail url (see `VuedaRouter.routes` in `vueda/core/routers.py`). Appending
        // "destroy" would target a DynamicRoute that does not exist.
        const actionSegment = isDestroy ? undefined : props.action;
        return {
            url: bulk.value
                ? getListUrl({ app: props.app, model: props.model, action: actionSegment })
                : getDetailUrl({ app: props.app, model: props.model, pk: pks.value[0], action: actionSegment }),
            options: {
                method: isDestroy ? "DELETE" : props.requestMethod || "PUT",
                headers,
                body,
            },
        };
    };

    const runAction = (options = {}) => {
        const request = buildRequest(options);
        return fetchHelper(request.url, request.options, "Failed to execute action", (message, response, data) => {
            if (response.status === 400) {
                return new FormValidationError(data, response);
            }
            if (response.status === 409) {
                return new ConfirmationRequiredError(data, response);
            }
            return new FetchError(message, response, data);
        });
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
        },
        buildRequest,
        runAction,
        redirectTo,
    };
}
