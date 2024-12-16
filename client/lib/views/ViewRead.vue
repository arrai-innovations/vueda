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
import { LIST_VIEW_CRUD_NAME, memoizedStartCase } from "@vueda/utils/crudSupport.js";
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
});
const emit = defineEmits(["object", "loading", "related-object", "calculated-object", "form-object", "form-context"]);
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

const viewName = "read";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);

const titleStr = computed(() => {
    return `Read ${memoizedStartCase(modelConfig.info?.verbose_name)}` || "Read Item";
});
const fetchFields = computed(() => props.fetchFields ?? modelConfig.config?.fetchFields);

const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    pk: toRef(props, "pk"),
    retrieveArgs: {
        f: computed(() => [modelConfig.info?.pk, fetchFields.value]),
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
    emit("related-object", readonly(instanceObject.state.relatedObjects || {}));
    emit("calculated-object", readonly(instanceObject.state.calculatedObjects || {}));
    emit(
        "form-object",
        toRef(() => formContext.state.values),
    );
    emit("form-context", formContext);
});
/** @type {import('vue').Ref<Error|null>} */
const myError = ref(null);
useObject404(props, instanceObject, modelConfig, myError);
const checkIfValidAndActive = () => {
    if (!validAndActive.value) {
        const newE = new Error("Invalid props for ViewRead.");
        newE.name = ""; // delete will just show the default Error.prototype.name
        delete newE.stack;
        if (!props.app) {
            newE.message += "\nprop 'app' is required";
        }
        if (!props.model) {
            newE.message += "\nprop 'model' is required";
        }
        if (!props.pk) {
            newE.message += "\nprop 'pk' is required";
        }
        // if not active, you'll never see this anyway.
        newE.redirectParams = {
            name: LIST_VIEW_CRUD_NAME,
        };
        newE.redirectTitle = `Return to the ${memoizedStartCase(modelConfig.info.verbose_name)} list view.`;
        delete newE.stack;
        myError.value = newE;
    }
};
let mountedOrActivatedTimeout = null;
watch(
    isActive,
    (active) => {
        if (active) {
            if (mountedOrActivatedTimeout) {
                clearTimeout(mountedOrActivatedTimeout);
            }
            mountedOrActivatedTimeout = setTimeout(checkIfValidAndActive, 2500);
        }
    },
    { immediate: true },
);
const combinedError = computed(() => {
    return myError.value || modelConfig.error || instanceObject.state.error;
});
const combinedErrored = computed(() => !!combinedError.value);
const combinedWhileText = computed(() =>
    myError.value
        ? "validating props"
        : modelConfig.error
          ? "getting model information"
          : instanceObject.state.error
            ? "fetching object data"
            : "",
);
const formContextProps = reactive({
    initialValues: {},
});
const combinedFormProps = computed(() => {
    return {
        ...(modelConfig.config.formProps || {}),
        ...(props.formProps || {}),
    };
});
const computedWidgetProps = computed(() => {
    return {
        ...props.widgetProps,
        ...instanceObject?.state?.calculatedObject,
    };
});
const formContext = useForm(formContextProps);
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
const pageLoading = computed(() => loadingCombine(modelConfig.loading, instanceObject.state.loading));
const formId = computed(() => `${props.app}-${props.model}-${props.pk}-read`);
const detailedActions = computed(() => {
    return modelConfig.config?.actions?.filter((n) => {
        const a = modelConfig.config?.actionDetails?.[n];
        // return a && viewName !== n && !a.detail && !a.bulk && availableTransitions?.includes(n);
        //TODO: needs to have a way to know whether the action is workflow action
        return a && viewName !== n && a.detail;
    });
});
</script>

<template>
    <div :class="props.class" data-qa="read-view">
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
            <div class="flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max" data-qa="read-action-buttons">
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
        <div :class="props.outerClass" data-qa="read-form">
            <error-display
                :error="combinedError"
                :errored="combinedErrored"
                :ignore-form-validation-errors="true"
                :while-text="combinedWhileText"
            />
            <form v-bind="$attrs" :id="formId">
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
