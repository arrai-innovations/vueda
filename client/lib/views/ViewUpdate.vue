<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import DetailedView from "@vueda/components/DetailedView.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { useWarnings } from "@vueda/use/useWarnings.js";
import { computed, reactive, toRef, unref } from "vue";

const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    pk: {
        type: String,
        required: true,
    },
    submitFields: {
        type: Array,
        default: undefined,
    },
    // other form-model props will get passed in via $attrs, as long as there are no conflicts
});

const viewName = "update";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);

const submitFields = computed(() => props.submitFields ?? modelConfig.config?.submitFields);

const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    pk: toRef(props, "pk"),
    retrieveArgs: {
        f: computed(() => [modelConfig.info?.pk, submitFields.value]),
        e: computed(() => modelConfig.config?.expands),
    },
    intendToRetrieve: false,
});

const instanceObjectForSubmit = useObject({
    props: instanceObjectProps,
});

const emit = defineEmits([
    "object",
    "loading",
    "related-object",
    "calculated-object",
    "form-object",
    "form-context",
    "form-refresh",
]);

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
    emit,
});

useWarnings(toRef(props, "app"), toRef(props, "model"), formContext, viewName, toRef(props, "pk"));
</script>
<template>
    <detailed-view
        v-model="formContextProps.initialValues"
        :app="app"
        :model="model"
        :object-form="objectForm"
        :pk="pk"
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
    </detailed-view>
</template>
