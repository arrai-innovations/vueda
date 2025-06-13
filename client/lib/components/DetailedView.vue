<script setup>
import { assignReactiveObject, loadingCombine, useObject } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import StickyBar from "@vueda/components/StickyBar.vue";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useObject404 } from "@vueda/use/useObject404.js";
import { useObjectsWorkflowTransitions } from "@vueda/use/useObjectsWorkflowTransitions.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import { computed, inject, onMounted, reactive, readonly, ref, toRef, watch } from "vue";

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
    viewName: {
        type: String,
        required: true,
    },
    pk: {
        type: String,
        required: true,
    },
    objectForm: {
        type: Object,
        default: undefined,
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
    expand: {
        type: Array,
        default: undefined,
        description: "The expanding fields in the form.",
    },
    expandDetails: {
        type: Object,
        default: undefined,
        description: "Any overriding expand information by field path.",
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
const formInitialValue = defineModel({
    type: Object,
    required: true,
});
const validAndActive = computed(
    () =>
        !!(
            isActive.value &&
            props.app &&
            props.model &&
            props.pk &&
            modelConfig.loading === false &&
            modelConfig.config?.fetchFields
        ),
);

const intendToRetrieve = computed(
    () => validAndActive.value && !props.objectForm?.state?.loading && !props.objectForm?.state?.submitErrored,
);

const emit = defineEmits(["object", "loading", "related-object", "calculated-object", "form-object", "form-context"]);

/** @type {import("@vueda/use/useForm.js").FormContext|null} */
const formContext = inject(FormContextSymbol, null);
const capitalizedViewName = computed(() => memoizedStartCase(props.viewName));
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), toRef(props, "viewName"));
const filteredActions = useFilteredActions({
    modelConfigInstance: modelConfig,
});
const titleStr = computed(() => {
    return (
        `${capitalizedViewName.value} ${memoizedStartCase(modelConfig.config?.verboseName)}` ||
        `${capitalizedViewName.value} Item`
    );
});
const fetchFields = computed(() => props.fetchFields ?? modelConfig.config?.fetchFields);
const objectTransitions = useObjectsWorkflowTransitions(
    toRef(props, "app"),
    toRef(props, "model"),
    toRef(props, "pk"),
    isActive,
);
const instanceObjectProps = reactive({
    target: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    pk: toRef(props, "pk"),
    params: {
        [FIELDS_PARAM]: computed(() => [modelConfig.info?.pk ?? "id", fetchFields.value, "available_actions"]),
        [EXPAND_PARAM]: computed(() => modelConfig.config?.expand),
    },
    intendToRetrieve,
    relatedObjectRules: toRef(props, "relatedObjectRules"),
    calculatedObjectRules: toRef(props, "calculatedObjectRules"),
});

const instanceObjectForRetrieve = useObject({
    props: instanceObjectProps,
});

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
            assignReactiveObject(
                formInitialValue,
                omit(cloneDeep(instanceObjectForRetrieve.state.object), "available_actions"),
            );
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
    return (
        myError.value || modelConfig.error || instanceObjectForRetrieve.state.error || props.objectForm?.state?.error
    );
});
const combinedErrored = computed(() => !!combinedError.value);
const combinedWhileText = computed(() =>
    myError.value
        ? "validating props"
        : modelConfig.error
          ? "getting model information"
          : instanceObjectForRetrieve.state.error
            ? "fetching object data"
            : props.objectForm?.state?.error
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
const formId = computed(() => `${props.app}-${props.model}-${props.pk}-${props.viewName}`);
const availableActions = computed(() => {
    const objectAvailableActions = instanceObjectForRetrieve.state.object?.available_actions;
    return (filteredActions.actions || []).filter((n) => objectAvailableActions?.includes(n));
});

const availableTransitions = computed(() => {
    return objectTransitions.transitions?.map((t) => t.name);
});
const detailActions = computed(() =>
    availableActions.value.filter((n) => {
        const a = modelConfig.config?.actionDetails?.[n];
        return a && props.viewName !== n && a.detail;
    }),
);
const nonDetailActions = computed(() =>
    availableActions.value.filter((n) => {
        const a = modelConfig.config?.actionDetails?.[n];
        return a && props.viewName !== n && !a.detail;
    }),
);
</script>
<template>
    <div :class="props.class" :data-qa="`${viewName}-form-root`">
        <page-title :loading="pageLoading" :title="titleStr">
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
                <slot name="extra-buttons" />
            </template>
            <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </page-title>
        <sticky-bar class="w-full">
            <div
                class="flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max"
                :data-qa="`${viewName}-action-button`"
            >
                <slot
                    v-if="viewName === 'update'"
                    :form="formId"
                    label="Submit"
                    :loading="objectForm?.state?.loading"
                    :modifed="formContext.state.anyModified"
                    name="submit-button"
                    type="submit"
                >
                    <Button :form="formId" label="Submit" :loading="objectForm?.state?.loading" type="submit" />
                </slot>
                <template v-for="actionName in detailActions" :key="actionName">
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
                <template v-for="transition in availableTransitions" :key="transition">
                    <slot
                        :app="app"
                        :label="memoizedStartCase(transition)"
                        :model="model"
                        name="transition-button"
                        :pk="pk"
                        :view="transition"
                    >
                        <link-model-view
                            :app="app"
                            button
                            :label="memoizedStartCase(transition)"
                            :model="model"
                            :pk="pk"
                            severity="secondary"
                            :view="transition"
                        />
                    </slot>
                </template>
            </div>
        </sticky-bar>
        <div :class="props.outerClass" :data-qa="`${viewName}-form`">
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
                    :expand="expand"
                    :expand-details="expandDetails"
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
