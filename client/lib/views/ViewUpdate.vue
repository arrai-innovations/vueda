<script setup>
import { assignReactiveObject, loadingCombine, useObject } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObject404 } from "@vueda/use/useObject404.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { memoizedStartCase } from "@vueda/utils/crudSupport.js";
import Button from "primevue/button";
import { computed, onMounted, reactive, readonly, ref, toRef, watch } from "vue";

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
    pk: {
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
    class: {
        type: [String, Array, Object],
        default: () => [],
    },
    fields: {
        type: Array,
        default: undefined,
        description: "The fields to render in the form.",
    },
    fieldDetails: {
        type: Object,
        default: undefined,
        description: "Any overriding field information by field path.",
    },
    fieldComponents: {
        type: Object,
        default: undefined,
        description: "Any overriding field components by field path.",
    },
    widgetComponents: {
        type: Object,
        default: undefined,
        description: "Any overriding widget components by field path.",
    },
    formProps: {
        type: Object,
        default: undefined,
        description: "Any overriding props for the form level.",
    },
    fieldProps: {
        type: Object,
        default: undefined,
        description: "Any overriding field props by field path.",
    },
    widgetProps: {
        type: Object,
        default: undefined,
        description: "Any overriding widget props by field path.",
    },
    relatedObjectRules: {
        type: Object,
        default: () => ({}),
    },
    calculatedObjectRules: {
        type: Object,
        default: () => ({
            some_test_field: (timesheet) => {
                return timesheet;
            },
        }),
    },
    // other form-model props will get passed in via $attrs, as long as there are no conflicts
});

const isActive = useIsActive();

const validAndActive = computed(
    () =>
        !!(
            isActive.value &&
            props.app &&
            props.model &&
            props.pk &&
            modelConfig.info?.pk &&
            modelConfig.config?.fetchFields
        ),
);

const emit = defineEmits(["object", "loading", "related-object", "calculated-object"]);

const viewName = "update";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);
const titleStr = computed(() => {
    return `Update ${memoizedStartCase(modelConfig.config?.verboseName)}` || "Update Item";
});
const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    pk: toRef(props, "pk"),
    retrieveArgs: {
        f: computed(() => {
            return [modelConfig.info?.pk, ...(modelConfig.config?.fetchFields || [])];
        }),
        e: computed(() => modelConfig.config?.expands),
    },
    intendToRetrieve: validAndActive,
    relatedObjectRules: toRef(props, "relatedObjectRules"),
    calculatedObjectRules: toRef(props, "calculatedObjectRules"),
});
const instanceObject = useObject({
    props: instanceObjectProps,
});

onMounted(() => {
    emit(
        "object",
        toRef(() => instanceObject.state.object),
    );
    emit(
        "loading",
        toRef(() => instanceObject.state.loading),
    );
    emit("related-object", readonly(instanceObject.state.relatedObjects));
    emit("calculated-object", readonly(instanceObject.state.calculatedObjects));
});
const formContextProps = reactive({
    initialValues: {},
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
const computedWidgetProps = computed(() => {
    // TODO: a key for instanceObject?.state?.calculatedObject
    return {
        ...props.widgetProps,
        ...instanceObject?.state?.calculatedObject,
    };
});
watch(
    [validAndActive, toRef(instanceObject.state, "loading")],
    ([vAA, loading]) => {
        // populate the form when the page loads and when we have the object back.
        // undefined on loading means not run yet.
        if (vAA && loading === false) {
            assignReactiveObject(formContextProps.initialValues, instanceObject.state.object);
        }
    },
    {
        immediate: true,
    },
);
/** @type {import('vue').Ref<Error|null>} */
const myError = ref(null);
useObject404(props, instanceObject, modelConfig, myError);
const combinedError = computed(() => {
    return myError.value || modelConfig.error || instanceObject.state.error || objectForm.state.error;
});
const combinedErrored = computed(() => !!combinedError.value);
const combinedWhileText = computed(() =>
    myError.value
        ? "validating props"
        : modelConfig.error
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
const pageLoading = computed(() => loadingCombine(modelConfig.loading, instanceObject.state.loading));
const formId = computed(() => `${props.app}-${props.model}-${props.pk}-update`);
</script>
<template>
    <div :class="props.class">
        <page-title :loading="pageLoading" :title="titleStr">
            <template #button>
                <template
                    v-for="actionName in modelConfig.config?.actions?.filter((n) => {
                        const a = modelConfig.config?.actionDetails?.[n];
                        return a && viewName !== n && !a.detail && !a.bulk;
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
            <template #under-actions>
                <div class="flex flex-col sm:flex-row gap-1 w-full justify-end">
                    <template
                        v-for="actionName in modelConfig.config?.actions?.filter((n) => {
                            const a = modelConfig.config?.actionDetails?.[n];
                            return a && viewName !== n && a.detail && !a.bulk;
                        })"
                        :key="actionName"
                    >
                        <slot
                            :app="app"
                            :label="memoizedStartCase(actionName)"
                            :model="model"
                            name="action-button"
                            :pk="pk"
                            :view="actionName"
                        >
                            <link-model-view
                                :app="app"
                                button
                                :label="memoizedStartCase(actionName)"
                                :model="model"
                                :pk="pk"
                                severity="secondary"
                                :view="actionName"
                            />
                        </slot>
                    </template>
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
            </template>
        </page-title>
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
                    :field-components="fieldComponents"
                    :field-details="fieldDetails"
                    :field-props="fieldProps"
                    :fields="fields"
                    :model="model"
                    :variant="formModelVariant"
                    :view="viewName"
                    :widget-components="widgetComponents"
                    :widget-props="computedWidgetProps"
                    v-bind="combinedFormProps"
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
