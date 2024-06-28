<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import FormModel from "@vueda/components/FormModel.vue";
// eslint-disable-next-line no-unused-vars
import PageTitle from "@vueda/components/PageTitle.vue";
import useCombinedClasses from "@vueda/use/useCombinedClasses.js";
import useLeaveUnload from "@vueda/use/useLeaveUnload.js";
import useModelConfig from "@vueda/use/useModelConfig.js";
import Button from "primevue/button";
import { computed, reactive, toRef } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    createFields: {
        type: Array,
        default: undefined,
    },
    initialData: {
        type: Object,
        default: () => ({}),
    },
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    headerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    titleClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    bodyClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    loadingClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    formModelVariant: {
        type: String,
        default: "default",
    },
    // other form-model props will get passed in via $attrs, as long as there are no conflicts
});

const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const calculatedCreateFields = computed(() => {
    // if they don't pass createFields, use the modelConfig fields.
    //  modelConfig fields already falls back to models fields supplied by the server
    return (
        props.createFields || modelConfig.config.createFields || modelConfig.info.model_fields?.map((f) => f.name) || []
    );
});

const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    id: null,
    retrieveArgs: {
        f: calculatedCreateFields,
    },
    intendToRetrieve: false,
});
const instanceObject = useObject({
    props: instanceObjectProps,
});

const myState = reactive({
    submitting: false,
    dirty: false,
    loading: false,
});

const handleSubmit = (formContext) => {
    myState.submitting = true;
    instanceObject.create(formContext.values).finally(() => {
        myState.submitting = false;
    });
};

const pageTitle = computed(() => {
    return `Create ${modelConfig.info?.verbose_name}` || "Create Item";
});

const handleDirty = (dirty) => {
    myState.dirty = dirty;
};
useLeaveUnload(myState);
const combinedClasses = useCombinedClasses("@vueda/views/ViewCreate.vue", props);
const uniqueId = (performance.now() + "").replace(".", "");
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <page-title :title="pageTitle">
            <template #button>
                <Button
                    class="w-full"
                    :form="`form-${uniqueId}`"
                    label="Submit"
                    :loading="modelConfig.loading"
                    type="submit"
                />
            </template>
        </page-title>

        <div :class="combinedClasses.bodyClass">
            <form-model
                :id="`form-${uniqueId}`"
                :app="app"
                :fields="calculatedCreateFields"
                :initial-data="initialData"
                :model="model"
                :variant="formModelVariant"
                v-bind="$attrs"
                @dirty="handleDirty"
                @submit="handleSubmit"
            >
            </form-model>
        </div>
    </div>
</template>

<style scoped></style>
