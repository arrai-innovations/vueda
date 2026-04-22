<script setup>
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import StickyBar from "@vueda/components/StickyBar.vue";
import Button from "@vueda/controls/button/Button.vue";
import Spinner from "@vueda/feedback/spinner/Spinner.vue";
import { useViewUpdate } from "@vueda/use/useViewUpdate.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { onMounted, provide, readonly, toRef, useSlots } from "vue";

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
    /** CSS class(es) applied to the div wrapping the error display and form. */
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
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
    <div :class="props.class" data-qa="update-form-root">
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
            <div class="flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max" data-qa="update-action-button">
                <!-- @slot [submit-button] Override the submit button shown in the sticky action bar. -->
                <slot
                    :form="instance.formId"
                    label="Submit"
                    :loading="objectForm.state.loading"
                    :modified="formContext.state.anyModified"
                    name="submit-button"
                    type="submit"
                >
                    <Button :form="instance.formId" :disabled="objectForm.state.loading" type="submit">
                        <Spinner v-if="objectForm.state.loading" />
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
        </sticky-bar>
        <div :class="props.outerClass" data-qa="update-form">
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
    </div>
</template>

<style scoped></style>
