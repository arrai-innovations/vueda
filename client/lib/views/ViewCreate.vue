<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import StickyBar from "@vueda/components/StickyBar.vue";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useForm } from "@vueda/use/useForm.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useModelInitialValues } from "@vueda/use/useModelInitialValues.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { memoizedStartCase } from "@vueda/utils/crudSupport.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import Button from "primevue/button";
import { computed, inject, onMounted, reactive, toRef } from "vue";

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
const emit = defineEmits(["form-object", "form-context"]);
const viewName = "create";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const filteredActions = useFilteredActions({
    modelConfigInstance: modelConfig,
});
const titleStr = computed(() => {
    return `Create ${memoizedStartCase(modelConfig.config?.verboseName)}` || "Create Item";
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
const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pk: null,
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    retrieveArgs: {
        [FIELDS_PARAM]: computed(() => {
            return [...(props.submitFields ?? modelConfig.config?.submitFields ?? [])];
        }),
        [EXPAND_PARAM]: computed(() => {
            const expands = modelConfig.config?.expands || [];
            return expands.filter(
                (expand) =>
                    formContext.state?.values[expand] !== undefined && formContext.state.values[expand] !== null,
            );
        }),
    },
    intendToRetrieve: false,
});
const instanceObject = useObject({
    props: instanceObjectProps,
});
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

onMounted(() => {
    emit(
        "form-object",
        toRef(() => formContext.state.values),
    );
    emit("form-context", formContext);
});
const nonDetailActions = computed(() =>
    (filteredActions.actions || [])?.filter((n) => {
        const a = modelConfig.config?.actionDetails?.[n];
        return a && viewName !== n && !a.detail;
    }),
);
</script>
<template>
    <div :class="props.class">
        <page-title :loading="modelConfig.loading" :title="titleStr">
            <template #button>
                <template v-for="actionName in nonDetailActions" :key="actionName">
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
                    :modifed="formContext.state.anyModified"
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
