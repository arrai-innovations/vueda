<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import LoadingSpinner from "@vueda/components/LoadingSpinner.vue";
import { FormModel } from "@vueda/components/index.js";
import { useCombinedClasses, useLeaveUnload } from "@vueda/use/index.js";
import useModelConfig from "@vueda/use/useModelConfig.js";
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
    return props.createFields || modelConfig.config.fields.map((f) => f.name);
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
});

const handleSubmit = (formContext) => {
    myState.submitting = true;
    instanceObject.create(formContext.values).finally(() => {
        myState.submitting = false;
    });
};
const handleDirty = (dirty) => {
    myState.dirty = dirty;
};
useLeaveUnload(myState);
const combinedClasses = useCombinedClasses("@vueda/views/ViewCreate.vue", props);
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <div :class="combinedClasses.headerClass">
            <h1 :class="combinedClasses.titleClass">
                {{ `Create ${modelConfig.info?.verbose_name}` || "Create Item" }}
                <loading-spinner v-if="modelConfig.loading" :class="combinedClasses.loadingClass" />
            </h1>
        </div>
        <div :class="combinedClasses.bodyClass">
            <form-model
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
