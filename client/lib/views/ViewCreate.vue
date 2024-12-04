<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import StickyBar from "@vueda/components/StickyBar.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useModelInitialValues } from "@vueda/use/useModelInitialValues.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { memoizedStartCase } from "@vueda/utils/crudSupport.js";
import Button from "primevue/button";
import { computed, onMounted, reactive, toRef } from "vue";

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
    formModelVariant: {
        type: String,
        default: "default",
    },
    class: {
        type: [String, Array, Object],
        default: () => [],
    },
    formProps: {
        type: Object,
        default: () => ({}),
    },
    fieldProps: {
        type: Object,
        default: () => ({}),
    },
    widgetProps: {
        type: Object,
        default: () => ({}),
    },
    submitFields: {
        type: Array,
        default: undefined,
    },
    // other form-model props will get passed in via $attrs, as long as there are no conflicts
});
const viewName = "create";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);
const titleStr = computed(() => {
    return `Create ${memoizedStartCase(modelConfig.config?.verboseName)}` || "Create Item";
});
const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pk: null,
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    retrieveArgs: {
        f: computed(() => {
            return [...(props.submitFields ?? modelConfig.config?.submitFields ?? [])];
        }),
        e: computed(() => modelConfig.config?.expands),
    },
    intendToRetrieve: false,
});
const instanceObject = useObject({
    props: instanceObjectProps,
});
const modelInitialValues = useModelInitialValues(
    toRef(props, "app"),
    toRef(props, "model"),
    toRef(() => modelConfig.config?.displayFields),
);

const formContextProps = reactive({
    initialValues: modelInitialValues,
});
const formContext = useForm(formContextProps);
const objectFormProps = reactive({
    app: toRef(props, "app"),
    model: toRef(props, "model"),
    verboseName: computed(() => modelConfig.config?.verboseName),
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
const combinedFormProps = computed(() => {
    return {
        ...(modelConfig.config.formProps || {}),
        ...(props.formProps || {}),
    };
});
const formId = `form-${props.app}-${props.model}-${viewName}`;
const emit = defineEmits(["form-object", "form-context"]);

onMounted(() => {
    emit(
        "form-object",
        toRef(() => formContext.state.values),
    );
    emit("form-context", formContext);
});
</script>
<template>
    <div :class="props.class">
        <page-title :loading="modelConfig.loading" :title="titleStr">
            <template #button>
                <template
                    v-for="actionName in modelConfig.config?.actions?.filter((name) => {
                        const actionDetail = modelConfig.config?.actionDetails?.[name];
                        return actionDetail && viewName !== name && !actionDetail.detail && !actionDetail.bulk;
                    })"
                    :key="actionName"
                >
                    <slot
                        :app="app"
                        :label="memoizedStartCase(actionName)"
                        :model="model"
                        name="targetless-action-button"
                        :view="actionName"
                    >
                        <link-model-view
                            :app="app"
                            class="w-full"
                            :label="memoizedStartCase(actionName)"
                            :model="model"
                            :view="actionName"
                        />
                    </slot>
                </template>
            </template>
            <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </page-title>
        <sticky-bar class="w-full">
            <div class="flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max" data-qa="update-action-buttons">
                <slot
                    :form="formId"
                    label="Submit"
                    :loading="objectForm.state.loading"
                    name="submit-button"
                    type="submit"
                >
                    <Button :form="formId" label="Submit" :loading="objectForm.state.loading" type="submit" />
                </slot>
            </div>
        </sticky-bar>
        <div>
            <error-display
                :error="combinedError"
                :errored="combinedErrored"
                :ignore-form-validation-errors="true"
                :while-text="combinedWhileText"
            />
            <form v-bind="$attrs" :id="formId" @submit.prevent="objectForm.submit">
                <form-model
                    :app="app"
                    v-bind="combinedFormProps"
                    :field-props="props.fieldProps"
                    :model="model"
                    :variant="formModelVariant"
                    :view="viewName"
                    :widget-props="props.widgetProps"
                >
                    <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps || {}" />
                    </template>
                </form-model>
            </form>
        </div>
    </div>
</template>

<style scoped></style>
