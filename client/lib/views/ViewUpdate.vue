<script setup>
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormConfirmDialog from "@vueda/components/FormConfirmDialog.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import PageActions from "@vueda/components/PageActions.vue";
import StickyBar from "@vueda/components/StickyBar.vue";
import Button from "@vueda/controls/button/Button.vue";
import "@vueda/theme/vueda-tailwind/views/ViewUpdate.theme.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useViewUpdate } from "@vueda/use/useViewUpdate.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { computed, onMounted, provide, readonly, toRef, useSlots } from "vue";

/**
 * Editable detail view that loads a model instance, presents it in a form, and submits changes
 * back to the server on save.
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
    /** Django model name used to resolve API endpoints and configuration. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key of the object instance to fetch and edit. */
    pk: {
        type: String,
        required: true,
    },
    /** Field names included in the update submission payload; falls back to the model config's submitFields. */
    submitFields: {
        type: Array,
        default: undefined,
    },
    /** Named view to redirect to after a successful update; `null` stays on the current page. */
    redirectAfter: {
        type: String,
        default: null,
        validator: (value) => ["list", "read", null].includes(value),
    },
    /** CSS class(es) applied to the outermost root element. */
    class: {
        type: [String, Array, Object],
        default: () => [],
    },
    ...THEME_OVERRIDE_PROPS,
    /** Theme variant forwarded to the inner FormModel component. */
    formModelVariant: {
        type: String,
        default: "default",
    },
    /** Field names to render in the form; overrides the model config default. */
    fields: {
        type: Array,
        default: undefined,
    },
    /** Map of field paths to field detail overrides. */
    fieldDetails: {
        type: Object,
        default: undefined,
    },
    /** Field names to render in expanded (inline) mode. */
    expand: {
        type: Array,
        default: undefined,
    },
    /** Map of expand field paths to detail overrides. */
    expandDetails: {
        type: Object,
        default: undefined,
    },
    /** Map of field paths to async functions returning an override field component. */
    fieldComponents: {
        type: Object,
        default: undefined,
    },
    /** Map of field paths to async functions returning an override widget component. */
    widgetComponents: {
        type: Object,
        default: undefined,
    },
    /** Extra props merged into the FormModel component. */
    formProps: {
        type: Object,
        default: undefined,
    },
    /** Map of field paths to additional props passed to the field component. */
    fieldProps: {
        type: Object,
        default: undefined,
    },
    /** Map of field paths to additional props passed to the widget component. */
    widgetProps: {
        type: Object,
        default: undefined,
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
});

const emit = defineEmits(["object", "loading", "related-object", "calculated-object", "form-object", "form-context"]);

const slots = useSlots();

const { formContext, objectForm, instanceObject, instance, actions } = useViewUpdate(props);

// Contribute the page title and loading state to the layout's PageTitle display.
usePageTitle(() => ({ title: instance.titleStr, loading: instance.pageLoading }));

const theme = useTheme("ViewUpdate", props);
const stickyBarTheme = useTheme("StickyBar", {});
const dirtyClass = computed(() => stickyBarTheme("dirty"));

provide(FormContextSymbol, formContext);

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
    <!-- TODO: theme.hideStyle requires a single themed root -->
    <div :class="[theme('root'), props.class]" data-qa="update-form-root">
        <!-- Page-level actions teleport into the layout's PageTitle action zone. -->
        <page-actions>
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
                        emphasis="outline"
                    />
                </slot>
            </template>
            <!-- @slot [extra-buttons] Additional action buttons appended in the page title action area. -->
            <slot name="extra-buttons" />
        </page-actions>
        <sticky-bar zone="top" reveal="scroll-up-or-idle">
            <template #primary>
                <div
                    class="flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max"
                    data-qa="update-action-buttons"
                >
                    <!-- @slot [submit-button] Override the submit button shown in the sticky action bar. -->
                    <slot
                        :form="instance.formId"
                        label="Submit"
                        :loading="objectForm.state.loading"
                        :modified="formContext.state.anyModified"
                        name="submit-button"
                        type="submit"
                    >
                        <Button
                            :form="instance.formId"
                            :disabled="objectForm.state.loading"
                            type="submit"
                            tone="primary"
                        >
                            <LoadingSpinnerInline v-if="objectForm.state.loading" />
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
                                :view="actionName"
                                emphasis="outline"
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
                                :view="transition"
                                emphasis="outline"
                            />
                        </slot>
                    </template>
                </div>
            </template>
            <template #secondary>
                <span
                    v-if="formContext.state.anyModified"
                    :class="dirtyClass"
                    data-qa="update-dirty-indicator"
                    role="status"
                    aria-live="polite"
                >
                    <span aria-hidden="true">●</span>
                    Unsaved changes
                </span>
            </template>
        </sticky-bar>
        <div :class="theme('body')" data-qa="update-form">
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
                    view="update"
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
        <form-confirm-dialog
            :controller="objectForm.confirmation"
            title="Confirm save"
            description="This change has warnings. Review them before saving."
            confirm-label="Save anyway"
        />
    </div>
</template>

<style scoped></style>
