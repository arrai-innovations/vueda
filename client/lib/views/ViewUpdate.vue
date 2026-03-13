<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import DetailView from "@vueda/components/DetailView.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { useWarnings } from "@vueda/use/useWarnings.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, reactive, toRef, unref } from "vue";

/**
 * Editable detail view that loads a model instance, presents it in a form, and submits changes
 * back to the server on save.
 *
 * @vueda-slot-forward DetailView
 */
defineOptions({});

const props = defineProps({
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name used to resolve API endpoints and configuration. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key of the object instance to fetch and edit. */
    pk: {
        type: String,
        required: true,
    },
    /** Field names included in the update submission payload; falls back to the model config's submitFields. */
    submitFields: {
        type: Array,
        default: undefined,
    },
    /** Named view to redirect to after a successful update; `null` stays on the current page. */
    redirectAfter: {
        type: String,
        default: null, // meaning "stay here"
        validator: (value) => ["list", "read", null].includes(value),
    },
    // other form-model props will get passed in via $attrs, as long as there are no conflicts
});

const viewName = "update";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const submitFields = computed(() => props.submitFields ?? modelConfig.config?.submitFields);

const instanceObjectProps = reactive({
    target: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    pk: toRef(props, "pk"),
    params: {
        [FIELDS_PARAM]: computed(() => {
            const fields = [...(props.submitFields ?? modelConfig.config?.submitFields ?? [])];
            const pkKey = modelConfig.info?.pk ?? "id";
            if (!fields.includes(pkKey)) {
                fields.push(pkKey);
            }
            return fields;
        }),
        [EXPAND_PARAM]: computed(() => {
            const expand = modelConfig.config?.expand || [];
            return expand.filter(
                (expand) =>
                    formContext.state?.values[expand] !== undefined && formContext.state.values[expand] !== null,
            );
        }),
    },
    intendToRetrieve: false,
});

const instanceObjectForSubmit = useObject({
    props: instanceObjectProps,
});

const emit = defineEmits(["object", "loading", "related-object", "calculated-object", "form-object", "form-context"]);

const formContextProps = reactive({
    initialValues: {},
});
const formContext = useForm(formContextProps);
const arrayFields = computed(() => {
    const fieldDetails = modelConfig.config.fieldDetails || [];
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
    app: toRef(props, "app"),
    model: toRef(props, "model"),
    verboseName: computed(() => modelConfig.config?.verboseName),
    firstErrorField,
});
const objectForm = useObjectForm({
    props: objectFormProps,
    formContext,
    instanceObject: instanceObjectForSubmit,
    redirectAfter: toRef(props, "redirectAfter"),
});

useWarnings(toRef(props, "app"), toRef(props, "model"), formContext, viewName, toRef(props, "pk"), objectForm.state);
</script>
<template>
    <detail-view
        v-model="formContextProps.initialValues"
        :app="app"
        :model="model"
        :object-form="objectForm"
        :pk="pk"
        :submit-fields="submitFields"
        :view-name="viewName"
        v-bind="$attrs"
        @form-context="emit('form-context', $event)"
        @form-object="emit('form-object', $event)"
        @loading="emit('loading', $event)"
        @object="emit('object', $event)"
    >
        <template v-for="(_, slot) in $slots" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
    </detail-view>
</template>
