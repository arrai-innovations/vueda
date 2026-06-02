<script setup>
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import StickyBar from "@vueda/components/StickyBar.vue";
import Button from "@vueda/controls/button/Button.vue";
import { useDetailView } from "@vueda/use/useDetailView.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, onMounted, readonly, toRef, useSlots } from "vue";

/**
 * Renders a full detail page for a single model instance, including a page title, a sticky
 * action bar with available object actions and workflow transitions, and a FormModel that
 * displays or edits the object's fields. Fetches the object from the API automatically using
 * the provided app, model, and pk props.
 */

defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name identifying which object type to fetch and display. */
    model: {
        type: String,
        required: true,
    },
    /** View identifier used to load the model config and construct the form ID. */
    viewName: {
        type: String,
        required: true,
    },
    /** Primary key of the object instance to fetch and render. */
    pk: {
        type: String,
        required: true,
    },
    /** Form state object returned by `useObjectForm`, used to track submission state and trigger submit. */
    objectForm: {
        type: Object,
        default: undefined,
    },
    /** Theme variant applied to the root element. */
    variant: {
        type: String,
        default: "default",
    },
    /** CSS class(es) applied to the div wrapping the error display and form. */
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to the page title header area. */
    headerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to the page title text element. */
    titleClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to the page title body area. */
    bodyClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** CSS class(es) applied to the loading indicator. */
    loadingClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** Theme variant forwarded to the inner FormModel component. */
    formModelVariant: {
        type: String,
        default: "default",
    },
    /** CSS class(es) applied to the outermost root element. */
    class: {
        type: [String, Array, Object],
        default: () => [],
    },
    /** Field names to render in the form; overrides the model config default. */
    fields: {
        type: Array,
        default: undefined,
        description: "The fields to render in the form.",
    },
    /** Map of field paths to field detail overrides. */
    fieldDetails: {
        type: Object,
        default: undefined,
        description: "Any overriding field information by field path.",
    },
    /** Field names to render in expanded (inline) mode. */
    expand: {
        type: Array,
        default: undefined,
        description: "The expanding fields in the form.",
    },
    /** Map of expand field paths to detail overrides. */
    expandDetails: {
        type: Object,
        default: undefined,
        description: "Any overriding expand information by field path.",
    },
    /** Map of field paths to async functions returning an override field component. */
    fieldComponents: {
        type: Object,
        default: undefined,
        description: "Any overriding field components by field path.",
    },
    /** Map of field paths to async functions returning an override widget component. */
    widgetComponents: {
        type: Object,
        default: undefined,
        description: "Any overriding widget components by field path.",
    },
    /** Extra props merged into the FormModel component. */
    formProps: {
        type: Object,
        default: undefined,
        description: "Any overriding props for the form level.",
    },
    /** Map of field paths to additional props passed to the field component. */
    fieldProps: {
        type: Object,
        default: undefined,
        description: "Any overriding field props by field path.",
    },
    /** Map of field paths to additional props passed to the widget component. */
    widgetProps: {
        type: Object,
        default: undefined,
        description: "Any overriding widget props by field path.",
    },
    /** Rules mapping related object keys to fetch data alongside the main object. */
    relatedObjectRules: {
        type: Object,
        default: () => ({}),
    },
    /** Rules mapping calculated object keys to derive computed data alongside the main object. */
    calculatedObjectRules: {
        type: Object,
        default: () => ({}),
    },
    /** Field names to request from the API when fetching the object; overrides the model config default. */
    fetchFields: {
        type: Array,
        default: undefined,
    },
    /** Field names to include when submitting the form; overrides the model config default. */
    submitFields: {
        type: Array,
        default: undefined,
    },
    // other form-model props will get passed in via $attrs, as long as there are no conflicts
});

const formInitialValue = defineModel({
    type: Object,
    required: true,
});

const emit = defineEmits(["object", "loading", "related-object", "calculated-object", "form-object", "form-context"]);

/** @type {import("@vueda/use/useForm.js").FormContext|null} */
const formContext = inject(FormContextSymbol, null);
const slots = useSlots();

const { instanceObject, instance, actions } = useDetailView(props, formInitialValue);

const stickyBarTheme = useTheme("StickyBar", {});
const dirtyClass = computed(() => stickyBarTheme("dirty"));
const showDirtyIndicator = computed(() => props.viewName === "update" && Boolean(formContext?.state?.anyModified));

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
</script>
<template>
    <!-- TODO: theme.hideStyle requires a single themed root; useTheme here is only a StickyBar helper, this component has no own theme entry to gate on. -->
    <div :class="props.class" :data-qa="`${viewName}-form-root`">
        <page-title :loading="instance.pageLoading" :title="instance.titleStr">
            <template #button>
                <template v-for="actionName in actions.nonDetailActions" :key="actionName">
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
                <!-- @slot [extra-buttons] Additional action buttons appended in the page title action area. -->
                <slot name="extra-buttons" />
            </template>
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </page-title>
        <sticky-bar class="w-full">
            <template #primary>
                <div
                    class="flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max"
                    :data-qa="`${viewName}-action-button`"
                >
                    <!-- @slot [submit-button] Override the submit button shown in the sticky action bar for update views. -->
                    <slot
                        v-if="viewName === 'update'"
                        :form="instance.formId"
                        label="Submit"
                        :loading="objectForm?.state?.loading"
                        :modified="formContext?.state?.anyModified"
                        name="submit-button"
                        type="submit"
                    >
                        <Button :form="instance.formId" :disabled="objectForm?.state?.loading" type="submit">
                            <LoadingSpinnerInline v-if="objectForm?.state?.loading" />
                            Submit
                        </Button>
                    </slot>
                    <template v-for="actionName in actions.detailActions" :key="actionName">
                        <!-- @slot [action-button] Override an individual action link button in the sticky bar. -->
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
                    <template v-for="transition in actions.availableTransitions" :key="transition">
                        <!-- @slot [transition-button] Override an individual workflow transition button in the sticky bar. -->
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
            </template>
            <template v-if="showDirtyIndicator" #secondary>
                <span :class="dirtyClass" :data-qa="`${viewName}-dirty-indicator`" role="status" aria-live="polite">
                    <span aria-hidden="true">●</span>
                    Unsaved changes
                </span>
            </template>
        </sticky-bar>
        <div :class="props.outerClass" :data-qa="`${viewName}-form`">
            <error-display
                :error="instance.combinedError"
                :errored="instance.combinedErrored"
                :ignore-form-validation-errors="true"
                :while-text="instance.combinedWhileText"
            />
            <form v-bind="$attrs" :id="instance.formId" @submit.prevent="objectForm.submit">
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
                    :widget-props="instance.computedWidgetProps"
                    v-bind="instance.combinedFormProps"
                >
                    <template v-for="(_, slot) in slots" #[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps || {}" />
                    </template>
                </form-model>
            </form>
        </div>
    </div>
</template>

<style scoped></style>
