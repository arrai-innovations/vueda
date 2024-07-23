<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { memoizedStartCase } from "@vueda/utils/crudSupport.js";
import Button from "primevue/button";
import { computed, reactive, toRef } from "vue";

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
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const titleStr = computed(() => {
    return `Create ${memoizedStartCase(modelConfig.info?.verbose_name)}` || "Create Item";
});
const calculatedCreateFields = computed(() => modelConfig?.config?.createFields);
const calculatedCreateExpands = computed(() => modelConfig?.config?.createExpands);

const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    id: null,
    retrieveArgs: {
        f: calculatedCreateFields,
        e: calculatedCreateExpands,
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
const combinedError = computed(() => {
    return modelConfig.error || instanceObject.state.error || objectForm.state.error;
});
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
</script>
<template>
    <div>
        <page-title :loading="modelConfig.loading" :title="titleStr">
            <template #button>
                <div class="flex gap-1 w-full justify-end">
                    <link-model-view
                        :app="app"
                        class="whitespace-nowrap grow shrink-0"
                        label="Return to List"
                        :model="model"
                        view="list"
                    />
                </div>
            </template>
            <template #under-actions>
                <div class="flex gap-1 w-full justify-end">
                    <slot :click-handler="objectForm.submit" :loading="objectForm.state.loading" name="submit-button">
                        <Button label="Submit" :loading="objectForm.state.loading" @click.prevent="objectForm.submit" />
                    </slot>
                </div>
            </template>
        </page-title>
        <div>
            <error-display
                :error="combinedError"
                :errored="combinedErrored"
                :ignore-form-validation-errors="true"
                :while-text="combinedWhileText"
            />
            <form @submit.prevent="objectForm.submit">
                <form-model :app="app" :fields="calculatedCreateFields" :model="model" :variant="formModelVariant" />
            </form>
        </div>
    </div>
</template>

<style scoped></style>
