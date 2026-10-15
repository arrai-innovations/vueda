/**
 * @module use/useViewUpdate
 * @description Provides all reactive state and behaviour for an update view that fetches a single
 * model instance, presents it in an editable form, and submits changes back to the server.
 * Combines {@link module:use/useDetailView} for fetch/display wiring with the submit-side logic
 * (`useObjectForm`).
 *
 * Used directly by `ViewUpdate.vue` and intended as a building block for custom update-view
 * shells in consuming projects.
 *
 * @example Basic shell setup
 * ```vue
 * <script setup>
 * import FormConfirmDialog from "@vueda/form/confirm/FormConfirmDialog.vue";
 * import { useViewUpdate } from "@vueda/use/useViewUpdate.js";
 * import { provide } from "vue";
 * import { FormContextSymbol } from "@vueda/utils/symbols.js";
 *
 * const props = defineProps({ app: String, model: String, pk: String, redirectAfter: String });
 * const { formContext, objectForm, instance, actions } = useViewUpdate(props);
 * provide(FormContextSymbol, formContext);
 * </script>
 * <template>
 *     <!-- ...form markup... -->
 *     <!-- Required: resolves submit-time warning confirmations (HTTP 409); without it warned saves are cancelled. -->
 *     <FormConfirmDialog :controller="objectForm.confirmation" />
 * </template>
 * ```
 */
import { useObject } from "@arrai-innovations/reactive-helpers";
import { useDetailView } from "@vueda/use/useDetailView.js";
import { useForm } from "@vueda/use/useForm.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { computed, reactive, toRef, unref } from "vue";

/** @type {"update"} */
const VIEW_NAME = "update";

/**
 * @typedef {object} ViewUpdateOptions
 *
 * Required identification.
 * @property {string} app - Django app label that owns the model.
 * @property {string} model - Django model name.
 * @property {string} pk - Primary key of the instance to fetch and edit.
 *
 * Optional data-fetching overrides.
 * @property {string[]} [fetchFields] - Field names to request from the API, on retrieval and in the update response; overrides the model config default when non-empty.
 * @property {string[]} [submitFields] - Field paths sent in the update request body; overrides the model config default when non-empty.
 * @property {{ [key: string]: object }} [relatedObjectRules] - Rules for fetching related objects alongside the instance.
 * @property {{ [key: string]: object }} [calculatedObjectRules] - Rules for deriving calculated objects alongside the instance.
 *
 * Optional form overrides.
 * @property {object} [formProps] - Extra props for the FormModel component. They win over the model config's `formProps` and lose to the form props below. The `app`, `model`, and `view` keys are ignored, because the view sets them.
 * @property {string[]} [fields] - Field names that the form renders. Replaces the model config list.
 * @property {object} [fieldDetails] - Map of field paths to field detail overrides.
 * @property {string[]} [expand] - Relations that the form renders as inline fieldsets. Replaces the model config list.
 * @property {object} [expandDetails] - Map of expand paths to detail overrides.
 * @property {object} [fieldComponents] - Map of field paths to field component overrides.
 * @property {object} [widgetComponents] - Map of field paths to widget component overrides.
 * @property {object} [fieldProps] - Map of field paths to props for each field component.
 * @property {object} [widgetProps] - Map of field paths to props for each widget component.
 * @property {string} [formModelVariant] - Theme variant that the FormModel component receives as `variant`.
 * @property {'list'|'read'|null} [redirectAfter] - Named view to redirect to after a successful update; null stays on the current page.
 */

/**
 * @typedef {object} ViewUpdateContext
 * @property {object} formInitialValue - Reactive object populated with the fetched instance data; passed as v-model to FormModel.
 * @property {import('@vueda/use/useForm.js').FormContext} formContext - The form context; provide it under FormContextSymbol so child field components can inject it.
 * @property {import('@vueda/use/useObjectForm.js').ObjectFormInstance} objectForm - The submit-side form state and submit trigger.
 * @property {import('@vueda/use/useModelConfig.js').ModelConfigState} modelConfig - Model metadata and view config.
 * @property {import('@arrai-innovations/reactive-helpers').ObjectInstance} instanceObject - The fetch-side object instance (display/read).
 * @property {import('vue').UnwrapNestedRefs<import('@vueda/use/useDetailView.js').DetailViewInstanceGroup>} instance - Computed display state.
 * @property {import('vue').UnwrapNestedRefs<import('@vueda/use/useDetailView.js').DetailViewActionsGroup>} actions - Available action and transition lists.
 */

/**
 * Extracts all reactive state and wiring for an update view of a single model instance.
 * The caller owns the template; this composable owns object fetching, form context setup,
 * action availability, error combination, and submission handling.
 *
 * Pass the component's `props` directly as `options`. After calling this composable, provide
 * `formContext` under `FormContextSymbol` so that nested field components can inject it.
 *
 * @param {ViewUpdateOptions} options
 * @returns {ViewUpdateContext}
 */
export function useViewUpdate(options) {
    const formContextProps = reactive({ initialValues: {} });
    const formContext = useForm(formContextProps);

    const internalOptions = reactive({
        app: toRef(options, "app"),
        model: toRef(options, "model"),
        viewName: VIEW_NAME,
        pk: toRef(options, "pk"),
        relatedObjectRules: computed(() => options.relatedObjectRules ?? {}),
        calculatedObjectRules: computed(() => options.calculatedObjectRules ?? {}),
        fetchFields: toRef(options, "fetchFields"),
        formProps: toRef(options, "formProps"),
        fields: toRef(options, "fields"),
        fieldDetails: toRef(options, "fieldDetails"),
        expand: toRef(options, "expand"),
        expandDetails: toRef(options, "expandDetails"),
        fieldComponents: toRef(options, "fieldComponents"),
        widgetComponents: toRef(options, "widgetComponents"),
        fieldProps: toRef(options, "fieldProps"),
        widgetProps: toRef(options, "widgetProps"),
        formModelVariant: toRef(options, "formModelVariant"),
        objectForm: undefined,
    });

    const { modelConfig, instanceObject, instance, actions } = useDetailView(
        internalOptions,
        formContextProps.initialValues,
    );

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
        pkKey: computed(() => modelConfig.info?.pk ?? "id"),
        pk: toRef(options, "pk"),
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

    // A separate object instance from the retrieval `instanceObject` above, so a save request never
    // races or overwrites the displayed data. An error this instance raises during submission is not
    // read directly; useObjectForm promotes an unhandled one onto objectForm.state.error, which
    // useDetailView's combinedError already watches.
    const instanceObjectForSubmit = useObject({ props: instanceObjectProps });

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

    const objectForm = useObjectForm({
        props: objectFormProps,
        formContext,
        instanceObject: instanceObjectForSubmit,
    });

    internalOptions.objectForm = objectForm;

    return {
        formInitialValue: formContextProps.initialValues,
        formContext,
        objectForm,
        modelConfig,
        instanceObject,
        instance,
        actions,
    };
}
