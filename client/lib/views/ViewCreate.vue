<script setup>
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormModel from "@vueda/components/FormModel.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import LoadingSpinnerInline from "@vueda/components/LoadingSpinnerInline.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import StickyBar from "@vueda/components/StickyBar.vue";
import Button from "@vueda/controls/button/Button.vue";
import { useViewCreate } from "@vueda/use/useViewCreate.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { onMounted, toRef } from "vue";

/**
 * Form view for creating a new model instance, including a page title, a sticky submit button
 * bar, and a FormModel that renders the configured fields.
 *
 * @vueda-slot-forward PageTitle
 * @vueda-slot-forward FormModel
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
    /** Field names included in the create submission payload; falls back to the model config's submitFields. */
    submitFields: {
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

const { formContext, objectForm, instance, actions } = useViewCreate(props);

onMounted(() => {
    emit(
        "form-object",
        toRef(() => formContext.state.values),
    );
    emit("form-context", formContext);
});
</script>
<template>
    <div :class="props.class">
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
            </template>
            <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </page-title>
        <sticky-bar class="w-full">
            <div class="flex flex-wrap gap-1 2xl:gap-2 w-full sm:w-fit sm:max-w-max" data-qa="update-action-buttons">
                <slot
                    :form="instance.formId"
                    label="Submit"
                    :loading="objectForm.state.loading"
                    :modifed="formContext.state.anyModified"
                    name="submit-button"
                    type="submit"
                >
                    <Button :form="instance.formId" :disabled="objectForm.state.loading" type="submit">
                        <LoadingSpinnerInline v-if="objectForm.state.loading" />
                        Submit
                    </Button>
                </slot>
            </div>
        </sticky-bar>
        <div>
            <error-display
                :error="instance.combinedError"
                :errored="instance.combinedErrored"
                :ignore-form-validation-errors="true"
                :while-text="instance.combinedWhileText"
            />
            <form v-bind="$attrs" :id="instance.formId" @submit.prevent="objectForm.submit">
                <form-model
                    :app="app"
                    v-bind="instance.combinedFormProps"
                    :field-props="props.fieldProps"
                    :model="model"
                    :variant="formModelVariant"
                    :view="'create'"
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
