/**
 * @module use/useDetailView
 * @description Provides all reactive state and behaviour for a detail view that fetches and
 * displays a single model instance. Handles object fetching, title computation,
 * action and transition availability, error combination, and populating a form
 * initial-values object from the fetched data.
 *
 * Used directly by `DetailView.vue` and intended as a building block for custom
 * detail-view shells in consuming projects.
 *
 * @example Basic shell setup (update view)
 * ```vue
 * <script setup>
 * import { useDetailView } from "@vueda/use/useDetailView.js";
 * import { useForm } from "@vueda/use/useForm.js";
 * import { useObjectForm } from "@vueda/use/useObjectForm.js";
 * import { reactive, toRef } from "vue";
 *
 * const props = defineProps({ app: String, model: String, pk: String });
 * const formContextProps = reactive({ initialValues: {} });
 * useForm(formContextProps);
 * const { modelConfig, instance, actions } = useDetailView(props, formContextProps.initialValues);
 * </script>
 * ```
 *
 * @example Wiring the page title
 * ```html
 * <page-title :loading="instance.pageLoading" :title="instance.titleStr" />
 * ```
 *
 * @example Wiring action buttons
 * ```html
 * <template v-for="actionName in actions.nonDetailActions" :key="actionName">
 *     <link-model-view :app="app" :model="model" :view="actionName" />
 * </template>
 * <template v-for="actionName in actions.detailActions" :key="actionName">
 *     <link-model-view :app="app" :model="model" :pk="pk" :view="actionName" button />
 * </template>
 * <template v-for="transition in actions.availableTransitions" :key="transition">
 *     <link-model-view :app="app" :model="model" :pk="pk" :view="transition" button />
 * </template>
 * ```
 *
 * @example Wiring the form
 * ```html
 * <error-display
 *     :error="instance.combinedError"
 *     :errored="instance.combinedErrored"
 *     :while-text="instance.combinedWhileText"
 * />
 * <form :id="instance.formId" @submit.prevent="objectForm.submit">
 *     <form-model
 *         :app="app"
 *         :model="model"
 *         :view="viewName"
 *         :widget-props="instance.computedWidgetProps"
 *         v-bind="instance.combinedFormProps"
 *     />
 * </form>
 * <!-- Required: resolves submit-time warning confirmations (HTTP 409); without it warned saves are cancelled. -->
 * <form-confirm-dialog :controller="objectForm.confirmation" />
 * ```
 */
import { assignReactiveObject, loadingCombine, useObject } from "@arrai-innovations/reactive-helpers";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObject404 } from "@vueda/use/useObject404.js";
import { useObjectsWorkflowTransitions } from "@vueda/use/useObjectsWorkflowTransitions.js";
import { getActionName } from "@vueda/utils/actionMap.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import omit from "lodash-es/omit.js";
import { computed, inject, reactive, ref, toRef, watch } from "vue";

/**
 * @typedef {object} DetailViewOptions
 *
 * Required identification.
 * @property {string} app - Django app label that owns the model.
 * @property {string} model - Django model name.
 * @property {string} viewName - View identifier used to load model config and build the form ID (e.g. `"read"` or `"update"`).
 * @property {string} pk - Primary key of the instance to fetch.
 *
 * Optional data-fetching overrides.
 * @property {string[]} [fetchFields] - Field names to request from the API; overrides the model config default.
 * @property {{ [key: string]: object }} [relatedObjectRules] - Rules for fetching related objects alongside the instance.
 * @property {{ [key: string]: object }} [calculatedObjectRules] - Rules for deriving calculated objects alongside the instance.
 *
 * Optional form overrides.
 * @property {object} [formProps] - Extra props merged into the FormModel component.
 * @property {object} [widgetProps] - Extra props forwarded to every widget component inside the form.
 *
 * Optional submit state (needed when the view has a submit button, e.g. update).
 * @property {{ state: { loading: boolean, submitErrored: boolean, error: Error|null } }} [objectForm] - The `useObjectForm` result; used to suppress re-fetching during submission and to surface submit errors.
 */

/**
 * @typedef {object} DetailViewInstanceGroup
 *
 * @property {boolean} validAndActive - True when the component is mounted and all required props are set and model config has loaded.
 * @property {string} titleStr - Formatted page title derived from the view name and model verbose name.
 * @property {boolean} pageLoading - Combined loading state (model config + instance fetch).
 * @property {string} formId - Stable HTML `id` for the `<form>` element; use as `:id` on the form and `:form` on submit buttons.
 * @property {object} computedWidgetProps - Merged widget props (explicit overrides + calculated object data).
 * @property {Error|null} combinedError - The first active error across prop validation, model config, instance fetch, and form submission; null when none.
 * @property {boolean} combinedErrored - True when `combinedError` is non-null.
 * @property {string} combinedWhileText - Human-readable description of the operation that produced `combinedError`; empty string when no error.
 * @property {object} combinedFormProps - Merged FormModel props (model-config defaults overridden by explicit `formProps`).
 */

/**
 * @typedef {object} DetailViewActionsGroup
 *
 * @property {string[]} nonDetailActions - Action names that appear in the page-title button area (not detail-level, not the current view).
 * @property {string[]} detailActions - Action names that appear in the sticky bar alongside the submit button (detail-level, not the current view).
 * @property {string[]} availableTransitions - Workflow transition codes available for the current instance.
 */

/**
 * @typedef {object} DetailViewContext
 * @property {import('@vueda/use/useModelConfig.js').ModelConfigState} modelConfig - Model metadata and view config.
 * @property {import('@arrai-innovations/reactive-helpers').ObjectInstance} instanceObject - The `useObject` result; exposes `.state.object`, `.state.loading`, `.state.error`, `.state.relatedObjects`, `.state.calculatedObjects`, etc.
 * @property {import('vue').UnwrapNestedRefs<DetailViewInstanceGroup>} instance - Computed display state: title, loading, errors, and form wiring.
 * @property {import('vue').UnwrapNestedRefs<DetailViewActionsGroup>} actions - Available action and transition lists.
 */

/**
 * Extracts all reactive state and wiring for a detail view of a single model instance.
 * The caller owns the template; this composable owns object fetching, action availability,
 * error combination, and populating `formInitialValue` from the fetched object.
 *
 * Pass the component's `props` directly as `options` — the composable reads what it needs
 * via reactive property access. `formInitialValue` must be a reactive object (or a ref to
 * one); the composable watches the fetch and assigns the object data into it automatically.
 *
 * Theme, slot name resolution, `useSlots`, `defineEmits`, and `onMounted` event emission
 * are all caller responsibilities and are not handled by this composable.
 *
 * @param {DetailViewOptions} options
 * @param {import('vue').Ref<object> | object} formInitialValue - Reactive target populated with the fetched object data on each successful load.
 * @returns {DetailViewContext}
 */
export function useDetailView(options, formInitialValue) {
    if (!inject(LookupContextSymbol, null)) {
        useLookupContext();
    }

    const isActive = useIsActive();
    const modelConfig = useModelConfig(toRef(options, "app"), toRef(options, "model"), toRef(options, "viewName"));
    const filteredActions = useFilteredActions({ modelConfigInstance: modelConfig });

    const validAndActive = computed(
        () =>
            !!(
                isActive.value &&
                options.app &&
                options.model &&
                options.pk &&
                modelConfig.loading === false &&
                modelConfig.config?.fetchFields
            ),
    );

    const intendToRetrieve = computed(
        () => validAndActive.value && !options.objectForm?.state?.loading && !options.objectForm?.state?.submitErrored,
    );

    const capitalizedViewName = computed(() => memoizedStartCase(options.viewName));
    const titleStr = computed(
        () =>
            `${capitalizedViewName.value} ${memoizedStartCase(modelConfig.config?.verboseName)}` ||
            `${capitalizedViewName.value} Item`,
    );

    const fetchFields = computed(() => options.fetchFields ?? modelConfig.config?.fetchFields);

    const objectTransitions = useObjectsWorkflowTransitions(
        toRef(options, "app"),
        toRef(options, "model"),
        toRef(options, "pk"),
        isActive,
    );

    const instanceObjectProps = reactive({
        target: {
            app: toRef(options, "app"),
            model: toRef(options, "model"),
        },
        pkKey: computed(() => modelConfig.info?.pk ?? "id"),
        pk: toRef(options, "pk"),
        params: {
            [FIELDS_PARAM]: computed(() => [modelConfig.info?.pk ?? "id", fetchFields.value, "available_actions"]),
            [EXPAND_PARAM]: computed(() => modelConfig.config?.expand),
        },
        intendToRetrieve,
        relatedObjectRules: toRef(options, "relatedObjectRules"),
        calculatedObjectRules: toRef(options, "calculatedObjectRules"),
    });

    const instanceObject = useObject({ props: instanceObjectProps });

    watch(
        [validAndActive, toRef(instanceObject.state, "loading")],
        ([vAA, loading]) => {
            if (vAA && loading === false) {
                assignReactiveObject(
                    formInitialValue,
                    omit(cloneDeep(instanceObject.state.object), "available_actions"),
                );
            }
        },
        { immediate: true },
    );

    /** @type {import('vue').Ref<Error|null>} */
    const myError = ref(null);
    useObject404(options, instanceObject, modelConfig, myError);

    const combinedError = computed(
        () => myError.value || modelConfig.error || instanceObject.state.error || options.objectForm?.state?.error,
    );
    const combinedErrored = computed(() => !!combinedError.value);
    const combinedWhileText = computed(() =>
        myError.value
            ? "validating props"
            : modelConfig.error
              ? "getting model information"
              : instanceObject.state.error
                ? "fetching object data"
                : options.objectForm?.state?.error
                  ? "submitting form"
                  : "",
    );
    const combinedFormProps = computed(() => ({
        ...(modelConfig.config.formProps || {}),
        ...(options.formProps || {}),
    }));

    const pageLoading = computed(() => loadingCombine(modelConfig.loading, instanceObject.state.loading));
    const formId = computed(() => `${options.app}-${options.model}-${options.pk}-${options.viewName}`);

    const computedWidgetProps = computed(() => ({
        ...options.widgetProps,
        ...instanceObject?.state?.calculatedObject,
    }));

    const availableActions = computed(() => {
        const objectAvailableActions = instanceObject.state.object?.available_actions;
        return (filteredActions.actions || []).filter((n) => objectAvailableActions?.includes(n));
    });

    const availableTransitions = computed(() => objectTransitions.transitions?.map((t) => t.code));

    const detailActions = computed(() =>
        availableActions.value.filter((n) => {
            const a = modelConfig.config?.actionDetails?.[n];
            return a && getActionName(options.viewName) !== n && a.detail;
        }),
    );

    const nonDetailActions = computed(() =>
        availableActions.value.filter((n) => {
            const a = modelConfig.config?.actionDetails?.[n];
            return a && getActionName(options.viewName) !== n && !a.detail;
        }),
    );

    // The detail view's hero action: the one promoted to a filled CTA in the
    // action bar. By convention that is `update` (the edit affordance on a read
    // view); a consumer can override the set via `primaryActions`. Intersected
    // with the rendered detail actions so it never double-promotes (on an update
    // view `update` is the current view and not a detail action) and an override
    // naming an unavailable action is simply inert.
    const primaryActions = computed(() => {
        const candidates = options.primaryActions ?? ["update"];
        return new Set(candidates.filter((name) => detailActions.value.includes(name)));
    });

    return {
        modelConfig,
        instanceObject,
        instance: reactive({
            validAndActive,
            titleStr,
            pageLoading,
            formId,
            computedWidgetProps,
            combinedError,
            combinedErrored,
            combinedWhileText,
            combinedFormProps,
        }),
        actions: reactive({
            nonDetailActions,
            detailActions,
            availableTransitions,
            primaryActions,
        }),
    };
}
