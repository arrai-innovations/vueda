<script setup>
import { assignReactiveObject, loadingCombine, useObject } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import StickyBar from "@vueda/components/StickyBar.vue";
import { useForm } from "@vueda/use/useForm.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObject404 } from "@vueda/use/useObject404.js";
import { useObjectForm } from "@vueda/use/useObjectForm.js";
import { useWarnings } from "@vueda/use/useWarnings.js";
import { memoizedStartCase } from "@vueda/utils/crudSupport.js";
import cloneDeep from "lodash-es/cloneDeep.js";
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
        default: () => ({}),
    },
    fetchFields: {
        type: Array,
        default: undefined,
    },
    submitFields: {
        type: Array,
        default: undefined,
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

const emit = defineEmits([
    "object",
    "loading",
    "related-object",
    "calculated-object",
    "form-object",
    "form-context",
    "form-refresh",
]);

const viewName = "update";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);
const titleStr = computed(() => {
    return `Update ${memoizedStartCase(modelConfig.config?.verboseName)}` || "Update Item";
});
const fetchFields = computed(() => props.fetchFields ?? modelConfig.config?.fetchFields);
const submitFields = computed(() => props.submitFields ?? modelConfig.config?.submitFields);

const createInstanceObjectProps = (fields, intendToRetrieve = true) => {
    return reactive({
        crudArgs: {
            app: toRef(props, "app"),
            model: toRef(props, "model"),
        },
        pkKey: computed(() => modelConfig.info?.pk ?? "id"),
        pk: toRef(props, "pk"),
        retrieveArgs: {
            f: computed(() => [modelConfig.info?.pk, ...(fields.value || [])]),
            e: computed(() => modelConfig.config?.expands),
        },
        intendToRetrieve: computed(() => validAndActive.value && intendToRetrieve),
        relatedObjectRules: toRef(props, "relatedObjectRules"),
        calculatedObjectRules: toRef(props, "calculatedObjectRules"),
    });
};

const instanceObjectPropsForRetrieve = createInstanceObjectProps(fetchFields);
const instanceObjectForRetrieve = useObject({ props: instanceObjectPropsForRetrieve });

const instanceObjectPropsForSubmit = createInstanceObjectProps(submitFields, false);
const instanceObjectForSubmit = useObject({ props: instanceObjectPropsForSubmit });

onMounted(() => {
    emit(
        "object",
        toRef(() => instanceObjectForRetrieve.state.object),
    );
    emit(
        "loading",
        toRef(() => instanceObjectForRetrieve.state.loading),
    );
    emit("related-object", readonly(instanceObjectForRetrieve.state.relatedObjects || {}));
    emit("calculated-object", readonly(instanceObjectForRetrieve.state.calculatedObjects || {}));
    emit(
        "form-object",
        toRef(() => formContext.state.values),
    );
    emit("form-context", formContext);
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
    instanceObject: instanceObjectForSubmit,
    emit,
});
const computedWidgetProps = computed(() => {
    // TODO: a key for instanceObjectForRetrieve?.state?.calculatedObject
    return {
        ...props.widgetProps,
        ...instanceObjectForRetrieve?.state?.calculatedObject,
    };
});
watch(
    [validAndActive, toRef(instanceObjectForRetrieve.state, "loading")],
    ([vAA, loading]) => {
        // populate the form when the page loads and when we have the object back.
        // undefined on loading means not run yet.
        if (vAA && loading === false) {
            assignReactiveObject(formContextProps.initialValues, cloneDeep(instanceObjectForRetrieve.state.object));
        }
    },
    {
        immediate: true,
    },
);
/** @type {import('vue').Ref<Error|null>} */
const myError = ref(null);
useObject404(props, instanceObjectForRetrieve, modelConfig, myError);
const combinedError = computed(() => {
    return myError.value || modelConfig.error || instanceObjectForRetrieve.state.error || objectForm.state.error;
});
const combinedErrored = computed(() => !!combinedError.value);
const combinedWhileText = computed(() =>
    myError.value
        ? "validating props"
        : modelConfig.error
          ? "getting model information"
          : instanceObjectForRetrieve.state.error
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
const pageLoading = computed(() => loadingCombine(modelConfig.loading, instanceObjectForRetrieve.state.loading));
const formId = computed(() => `${props.app}-${props.model}-${props.pk}-update`);
// const workflow = useWorkflow(toRef(props, "app"), toRef(props, "model"),toRef(props.pk),isActive,validAndActive);
// const availableTransitions = computed(() => {
//     const transitions = Object.keys(workflow.objectTransitions)
//         .find(key => key === props.pk).flatMap(key => workflow.objectTransitions[key])
//         return transitions;
//     return []
// })

const detailedActions = computed(() => {
    return modelConfig.config?.actions?.filter((n) => {
        const a = modelConfig.config?.actionDetails?.[n];
        // return a && viewName !== n && !a.detail && !a.bulk && availableTransitions?.includes(n);
        //TODO: needs to have a way to know whether the action is workflow action
        return a && viewName !== n && a.detail;
    });
});
useWarnings(toRef(props, "app"), toRef(props, "model"), formContext, viewName, toRef(props, "pk"));
</script>
<template>
    <div :class="props.class" data-qa="update-view">
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
                <slot name="extra-buttons" />
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
                <template v-for="actionName in detailedActions" :key="actionName">
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
            </div>
        </sticky-bar>
        <div :class="props.outerClass" data-qa="update-form">
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
