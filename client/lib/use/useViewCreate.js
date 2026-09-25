/**
 * @module use/useViewCreate
 * @description Provides all reactive state and behaviour for a create view that collects
 * field values from a form and submits a new model instance to the server.
 * Handles model configuration, initial value derivation, form context setup,
 * action availability, error combination, and submission handling.
 *
 * Used directly by `ViewCreate.vue` and intended as a building block for custom create-view
 * shells in consuming projects.
 *
 * @example Basic shell setup
 * ```vue
 * <script setup>
 * import FormConfirmDialog from "@vueda/form/confirm/FormConfirmDialog.vue";
 * import { useViewCreate } from "@vueda/use/useViewCreate.js";
 * import { memoizedStartCase } from "@vueda/utils/case.js";
 * import { onMounted, toRef } from "vue";
 *
 * const props = defineProps({ app: String, model: String, redirectAfter: String });
 * const emit = defineEmits(["form-object", "form-context"]);
 * const { formContext, objectForm, instance, actions } = useViewCreate(props);
 *
 * onMounted(() => {
 *     emit("form-object", toRef(() => formContext.state.values));
 *     emit("form-context", formContext);
 * });
 * </script>
 * <template>
 *     <!-- ...form markup (see examples below)... -->
 *     <!-- Required: resolves submit-time warning confirmations (HTTP 409); without it warned saves are cancelled. -->
 *     <FormConfirmDialog :controller="objectForm.confirmation" />
 * </template>
 * ```
 *
 * @example Wiring the page title
 * ```html
 * <h1>{{ instance.titleStr }}</h1>
 * ```
 *
 * @example Wiring the form
 * ```html
 * <error-display
 *     :error="instance.combinedError"
 *     :errored="instance.combinedErrored"
 *     :ignore-form-validation-errors="true"
 *     :while-text="instance.combinedWhileText"
 * />
 * <form :id="instance.formId" @submit.prevent="objectForm.submit">
 *     <form-model
 *         :app="app"
 *         :model="model"
 *         view="create"
 *         v-bind="instance.combinedFormProps"
 *     />
 * </form>
 * ```
 *
 * @example Wiring the submit button
 * ```html
 * <Button :form="instance.formId" :disabled="objectForm.state.loading" type="submit">
 *     Submit
 * </Button>
 * ```
 */
import { useObject } from "@arrai-innovations/reactive-helpers";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useForm } from "@vueda/use/useForm.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useModelInitialValues } from "@vueda/use/useModelInitialValues.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, reactive, toRef, unref } from "vue";

/** @type {"create"} */
const VIEW_NAME = "create";

/**
 * @typedef {object} ViewCreateOptions
 *
 * Required identification.
 * @property {string} app - Django app label that owns the model.
 * @property {string} model - Django model name.
 *
 * Optional form overrides.
 * @property {string[]} [submitFields] - Field paths sent in the create request body; overrides the model config default when non-empty.
 * @property {string[]} [fetchFields] - Field names the server returns in the create response; overrides the model config default when non-empty.
 * @property {'list'|'update'|'read'} [redirectAfter] - Named view to redirect to after a successful create.
 * @property {object} [formProps] - Extra props merged into the FormModel component.
 */

/**
 * @typedef {object} ViewCreateInstanceGroup
 * @property {string} titleStr - Page title derived from the model verbose name (e.g. "Create Widget").
 * @property {boolean} pageLoading - True while model configuration is loading.
 * @property {string} formId - Stable HTML `id` for the `<form>` element; use as `:id` on the form and `:form` on submit buttons.
 * @property {Error|null} combinedError - The first active error across model config, instance, and form submission; null when none.
 * @property {boolean} combinedErrored - True when `combinedError` is non-null.
 * @property {string} combinedWhileText - Human-readable description of the operation that produced `combinedError`; empty string when no error.
 * @property {object} combinedFormProps - Merged FormModel props (model-config defaults overridden by explicit `formProps`).
 */

/**
 * @typedef {object} ViewCreateActionsGroup
 * @property {string[]} nonDetailActions - Action names that appear in the page-title button area (non-detail, not the create view itself).
 */

/**
 * @typedef {object} ViewCreateContext
 * @property {import('@vueda/use/useForm.js').FormContext} formContext - The form context; nested field components inject this via FormContextSymbol.
 * @property {import('@vueda/use/useObjectForm.js').ObjectFormInstance} objectForm - The submit-side form state and submit trigger.
 * @property {import('@vueda/use/useModelConfig.js').ModelConfigState} modelConfig - Model metadata and view config.
 * @property {import('@arrai-innovations/reactive-helpers').ObjectInstance} instanceObject - The submit-side object instance.
 * @property {import('vue').UnwrapNestedRefs<ViewCreateInstanceGroup>} instance - Computed display state.
 * @property {import('vue').UnwrapNestedRefs<ViewCreateActionsGroup>} actions - Available action lists.
 */

/**
 * Extracts all reactive state and wiring for a create view of a model instance.
 * The caller owns the template; this composable owns initial value derivation, form context
 * setup, action availability, error combination, and submission handling.
 *
 * Pass the component's `props` directly as `options`.
 *
 * @param {ViewCreateOptions} options
 * @returns {ViewCreateContext}
 */
export function useViewCreate(options) {
    if (!inject(LookupContextSymbol, null)) {
        useLookupContext();
    }

    const modelConfig = useModelConfig(toRef(options, "app"), toRef(options, "model"), VIEW_NAME);

    const filteredActions = useFilteredActions({ modelConfigInstance: modelConfig });

    const titleStr = computed(() => `Create ${memoizedStartCase(modelConfig.config?.verboseName)}` || "Create Item");

    const modelInitialValues = useModelInitialValues(
        toRef(options, "app"),
        toRef(options, "model"),
        toRef(() => modelConfig.config?.displayFields),
    );

    const formContextProps = reactive({ initialValues: modelInitialValues });
    const formContext = useForm(formContextProps);

    const submitFields = computed(() =>
        options.submitFields?.length ? options.submitFields : modelConfig.config?.submitFields,
    );
    const fetchFields = computed(() =>
        options.fetchFields?.length ? options.fetchFields : modelConfig.config?.fetchFields,
    );

    const instanceObjectProps = reactive({
        target: {
            app: toRef(options, "app"),
            model: toRef(options, "model"),
        },
        pk: null,
        pkKey: computed(() => modelConfig.info?.pk ?? "id"),
        params: {
            [FIELDS_PARAM]: computed(() => {
                const fields = [...(fetchFields.value ?? [])];
                const pkKey = modelConfig.info?.pk ?? "id";
                if (!fields.includes(pkKey)) {
                    fields.push(pkKey);
                }
                return fields;
            }),
            [EXPAND_PARAM]: computed(() => {
                const expand = modelConfig.config?.expand || [];
                return expand.filter(
                    (e) => formContext.state?.values[e] !== undefined && formContext.state.values[e] !== null,
                );
            }),
        },
        intendToRetrieve: false,
    });

    const instanceObject = useObject({ props: instanceObjectProps });

    const arrayFields = computed(() => {
        const fieldDetails = modelConfig.config?.fieldDetails || {};
        return Object.entries(fieldDetails)
            .filter(([, field]) => field.many)
            .map(([fieldName]) => fieldName);
    });

    const firstErrorField = computed(() =>
        formContext.getFirstErrorField(
            modelConfig.config?.displayFields || modelConfig.config?.fields || [],
            unref(arrayFields),
        ),
    );

    const objectFormProps = reactive({
        app: toRef(options, "app"),
        model: toRef(options, "model"),
        verboseName: computed(() => modelConfig.config?.verboseName),
        firstErrorField,
        redirectAfter: toRef(options, "redirectAfter"),
        submitFields,
    });

    const objectForm = useObjectForm({ props: objectFormProps, formContext, instanceObject });

    const combinedError = computed(() => modelConfig.error || instanceObject.state.error || objectForm.state.error);
    const combinedErrored = computed(() => !!combinedError.value);
    const combinedWhileText = computed(() =>
        modelConfig.error
            ? "getting model information"
            : instanceObject.state.error
              ? "fetching object data"
              : objectForm.state.error
                ? "submitting form"
                : "",
    );
    const combinedFormProps = computed(() => ({
        ...(modelConfig.config.formProps || {}),
        ...(options.formProps || {}),
    }));

    const pageLoading = computed(() => modelConfig.loading);
    const formId = computed(() => `form-${options.app}-${options.model}-${VIEW_NAME}`);

    const nonDetailActions = computed(() =>
        (filteredActions.actions || []).filter((n) => {
            const a = modelConfig.config?.actionDetails?.[n];
            return a && VIEW_NAME !== n && !a.detail;
        }),
    );

    return {
        formContext,
        objectForm,
        modelConfig,
        instanceObject,
        instance: reactive({
            titleStr,
            pageLoading,
            formId,
            combinedError,
            combinedErrored,
            combinedWhileText,
            combinedFormProps,
        }),
        actions: reactive({
            nonDetailActions,
        }),
    };
}
