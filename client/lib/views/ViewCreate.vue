<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { useForm } from "@vueda/use/useForm.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
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

const calculatedCreateFields = computed(() => modelConfig.config.createFields || []);

const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
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
const formContextProps = reactive({
    initialValues: {},
});
const formContext = useForm(formContextProps);
const objectFormProps = reactive({
    app: toRef(props, "app"),
    model: toRef(props, "model"),
    verboseName: computed(() => modelConfig.info?.verbose_name),
});
const objectForm = useObjectForm({
    props: objectFormProps,
    formContext,
    instanceObject,
});

const titleStr = computed(() => {
    return `Create ${modelConfig.info?.verbose_name}` || "Create Item";
});
const combinedClasses = useCombinedClasses("ViewCreate", props);
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <page-title :title="titleStr">
            <template #button>
                <Button
                    class="w-full"
                    label="Submit"
                    :loading="objectForm.running"
                    @click.prevent="objectForm.submit"
                />
            </template>
        </page-title>
        <div :class="combinedClasses.bodyClass">
            <error-display
                :error="modelConfig.error"
                :errored="modelConfig.errored"
                while-text="getting model information"
            />
            <error-display
                :error="objectForm.error"
                :errored="objectForm.errored"
                while-text="submitting create form"
            />
            <form @submit.prevent="objectForm.submit">
                <form-model
                    :app="app"
                    v-bind="$attrs"
                    :fields="calculatedCreateFields"
                    :model="model"
                    :variant="formModelVariant"
                />
            </form>
        </div>
    </div>
</template>

<style scoped></style>
