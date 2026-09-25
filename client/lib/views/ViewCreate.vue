<script setup>
import Button from "@vueda/controls/button/Button.vue";
import ErrorDisplay from "@vueda/display/error-display/ErrorDisplay.vue";
import LoadingSpinnerInline from "@vueda/display/loading/LoadingSpinnerInline.vue";
import FieldWarningsList from "@vueda/form/confirm/FieldWarningsList.vue";
import FormConfirmDialog from "@vueda/form/confirm/FormConfirmDialog.vue";
import FormModel from "@vueda/form/form-model/FormModel.vue";
import LinkModelView from "@vueda/navigation/link-model-view/LinkModelView.vue";
import PageActions from "@vueda/shell/page-title/PageActions.vue";
import StickyBar from "@vueda/shell/sticky/StickyBar.vue";
import "@vueda/theme/vueda-tailwind/views/ViewCreate.theme.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useViewCreate } from "@vueda/use/useViewCreate.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import omit from "lodash-es/omit.js";
import { computed, onMounted, toRef } from "vue";

/**
 * Form view for creating a new model instance, including a page title, a sticky submit button
 * bar, and a FormModel that renders the configured fields.
 *
 * @vueda-slot-forward FormModel
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
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
    /** View variant key used to select the model configuration for this view. */
    variant: {
        type: String,
        default: "default",
    },
    /** Variant key forwarded to the inner FormModel component. */
    formModelVariant: {
        type: String,
        default: "default",
    },
    /** CSS class(es) applied to the root element. */
    class: {
        type: [String, Array, Object],
        default: () => [],
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
    /** Extra props merged into the FormModel component, taking precedence over model-config defaults. */
    formProps: {
        type: Object,
        default: () => ({}),
    },
    /** Extra props forwarded to every field component rendered inside the form. */
    fieldProps: {
        type: Object,
        default: () => ({}),
    },
    /** Extra props forwarded to every widget component rendered inside the form. */
    widgetProps: {
        type: Object,
        default: () => ({}),
    },
    /** Field paths sent in the create request body; falls back to the model config's submitFields when omitted or empty. */
    submitFields: {
        type: Array,
        default: undefined,
    },
    /** Field names the server returns in the create response; falls back to the model config's fetchFields when omitted or empty. */
    fetchFields: {
        type: Array,
        default: undefined,
    },
    /** Named view to redirect to after a successful create submission. */
    redirectAfter: {
        type: String,
        default: "update",
        validator: (value) => ["list", "update", "read"].includes(value),
    },
    // other form-model props will get passed in via $attrs, as long as there are no conflicts
});
const emit = defineEmits(["form-object", "form-context"]);

const { formContext, objectForm, instance, actions, modelConfig } = useViewCreate(props);

const theme = useTheme("ViewCreate", props);

// Bound after combinedFormProps, and only when passed, so a component map set in model-config formProps still
// applies when this view receives none.
const componentOverrideProps = computed(() => {
    const overrides = {};
    if (props.fieldComponents !== undefined) {
        overrides.fieldComponents = props.fieldComponents;
    }
    if (props.widgetComponents !== undefined) {
        overrides.widgetComponents = props.widgetComponents;
    }
    return overrides;
});

// Contribute the page title and loading state to the layout's PageTitle display.
usePageTitle(() => ({ title: instance.titleStr, loading: instance.pageLoading }));

onMounted(() => {
    emit(
        "form-object",
        toRef(() => formContext.state.values),
    );
    emit("form-context", formContext);
});
</script>
<template>
    <div :class="[theme('root'), props.class]" data-qa="create-form-root">
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
                        :label="memoizedStartCase(actionName)"
                        :model="model"
                        :view="actionName"
                        emphasis="outline"
                    />
                </slot>
            </template>
        </page-actions>
        <sticky-bar zone="top" reveal="scroll-up-or-idle">
            <template #primary>
                <div
                    class="flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max"
                    data-qa="create-action-buttons"
                >
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
                </div>
            </template>
        </sticky-bar>
        <div :class="theme('body')" data-qa="create-form">
            <error-display
                :error="instance.combinedError"
                :errored="instance.combinedErrored"
                :ignore-form-validation-errors="true"
                :while-text="instance.combinedWhileText"
            />
            <form v-bind="$attrs" :id="instance.formId" @submit.prevent="objectForm.submit">
                <form-model
                    :app="app"
                    v-bind="{ ...instance.combinedFormProps, ...componentOverrideProps }"
                    :field-props="props.fieldProps"
                    :model="model"
                    :variant="formModelVariant"
                    :view="'create'"
                    :widget-props="props.widgetProps"
                >
                    <template
                        v-for="(_, slot) in omit($slots, ['form-confirm-dialog-warnings', 'warning-entry'])"
                        #[slot]="slotProps"
                    >
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
        >
            <!-- @slot [form-confirm-dialog-warnings] Override how warning messages render inside the confirmation dialog entirely; receives FormConfirmDialog's `warnings` slot scope (`warnings`, the object form's raw warnings mapping). Defaults to `FieldWarningsList`; a consumer that only wants to customize one field's entry can instead use the `warning-entry` slot below. -->
            <template #warnings="{ warnings }">
                <slot name="form-confirm-dialog-warnings" :warnings="warnings">
                    <FieldWarningsList :messages="warnings" :field-details="modelConfig?.config?.fieldDetails">
                        <!-- @slot [warning-entry] Override one field's entire warning layout; receives FieldWarningsList's `entry` slot scope (`field`, `label`, `messages`). -->
                        <template v-if="$slots['warning-entry']" #entry="entrySlotProps">
                            <slot name="warning-entry" v-bind="entrySlotProps" />
                        </template>
                    </FieldWarningsList>
                </slot>
            </template>
        </form-confirm-dialog>
    </div>
</template>

<style scoped></style>
