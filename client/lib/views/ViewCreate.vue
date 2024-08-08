<script setup>
import { assignReactiveObject, useObject } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useMergeFieldNameProps } from "@vueda/use/useMergeFieldNameProps.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { memoizedStartCase } from "@vueda/utils/crudSupport.js";
import isEqual from "lodash-es/isEqual.js";
import Button from "primevue/button";
import { computed, reactive, toRef, useAttrs, watch } from "vue";

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
    fieldProps: {
        type: Object,
        default: () => ({}),
    },
    widgetProps: {
        type: Object,
        default: () => ({}),
    },
    // other form-model props will get passed in via $attrs, as long as there are no conflicts
});
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const titleStr = computed(() => {
    return `Create ${memoizedStartCase(modelConfig.info?.verbose_name)}` || "Create Item";
});
const attrs = useAttrs();
// combined modelConfig?.config?.createFormProps with any attrs passed in
const computedCreateFormProps = reactive({});
watch(
    [() => modelConfig?.config?.createFormProps, () => attrs],
    ([createFormProps, attrs]) => {
        const desiredState = {
            ...createFormProps,
            ...attrs,
        };
        if (!isEqual(computedCreateFormProps, desiredState)) {
            assignReactiveObject(computedCreateFormProps, desiredState);
        }
    },
    { immediate: true, deep: true },
);
const calculatedDisplayFields = computed(() => {
    return modelConfig?.config?.createFields;
});
const calculatedCreateFields = computed(() => {
    const fields = new Set(modelConfig?.config?.createFields);
    fields.add("id");
    return Array.from(fields);
});
const calculatedCreateExpands = computed(() => modelConfig?.config?.createExpands);
const calculatedCreateFieldProps = useMergeFieldNameProps([
    toRef(() => props.fieldProps),
    toRef(() => modelConfig?.config?.createFieldProps),
]);
const calculatedCreateWidgetProps = useMergeFieldNameProps([
    toRef(() => props.widgetProps),
    toRef(() => modelConfig?.config?.createWidgetProps),
]);

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
    <div :class="props.class">
        <page-title :loading="modelConfig.loading" :title="titleStr">
            <template #button>
                <link-model-view
                    :app="app"
                    class="whitespace-nowrap grow shrink-0"
                    label="Return to List"
                    :model="model"
                    view="list"
                />
                <template
                    v-for="actionName in modelConfig.info.actions
                        ?.filter(
                            (a) =>
                                (modelConfig.config.createActions
                                    ? modelConfig.config.createActions.includes(a.name)
                                    : true) &&
                                !a.detail &&
                                !a.name.startsWith('bulk-'),
                        )
                        .map((a) => a.name)"
                    :key="actionName"
                >
                    <slot
                        :app="app"
                        :label="memoizedStartCase(actionName)"
                        :model="model"
                        name="target-less-action-button"
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
            <template #under-actions>
                <div class="flex flex-col sm:flex-row gap-1 w-full justify-end">
                    <slot :click="objectForm.submit" :loading="objectForm.state.loading" name="submit-button">
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
                <form-model
                    :app="app"
                    :field-objects="modelConfig.config?.createFieldDetails || modelConfig.config?.fieldDetails"
                    :field-props="calculatedCreateFieldProps"
                    :fields="calculatedDisplayFields"
                    :model="model"
                    :variant="formModelVariant"
                    :widget-props="calculatedCreateWidgetProps"
                    v-bind="computedCreateFormProps"
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
