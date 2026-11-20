<script setup>
import Button from "@vueda/controls/button/Button.vue";
import ErrorDisplay from "@vueda/display/error-display/ErrorDisplay.vue";
import LoadingSpinnerInline from "@vueda/display/loading/LoadingSpinnerInline.vue";
import Alert from "@vueda/feedback/alert/Alert.vue";
import AlertActions from "@vueda/feedback/alert/AlertActions.vue";
import AlertDescription from "@vueda/feedback/alert/AlertDescription.vue";
import AlertTitle from "@vueda/feedback/alert/AlertTitle.vue";
import Skeleton from "@vueda/feedback/skeleton/Skeleton.vue";
import FieldWarningsList from "@vueda/form/confirm/FieldWarningsList.vue";
import FormConfirmDialog from "@vueda/form/confirm/FormConfirmDialog.vue";
import FormModel from "@vueda/form/form-model/FormModel.vue";
import LinkModelView from "@vueda/navigation/link-model-view/LinkModelView.vue";
import PageActions from "@vueda/shell/page-title/PageActions.vue";
import StickyBar from "@vueda/shell/sticky/StickyBar.vue";
import "@vueda/theme/vueda-tailwind/views/ViewUpdate.theme.js";
import { VIEW_FORM_PROPS } from "@vueda/use/useFormModelProps.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useViewUpdate } from "@vueda/use/useViewUpdate.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import omit from "lodash-es/omit.js";
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
    /**
     * Field paths sent in the update request body, which also carries the primary key. Falls back to the model config's
     * submitFields when omitted or empty.
     */
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
    ...VIEW_FORM_PROPS,
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
    /**
     * Field names to request from the API when fetching the object and in the update response; falls back to the model
     * config's fetchFields when omitted or empty.
     */
    fetchFields: {
        type: Array,
        default: undefined,
    },
});

const emit = defineEmits(["object", "loading", "related-object", "calculated-object", "form-object", "form-context"]);

const slots = useSlots();

const { formContext, objectForm, instanceObject, instance, actions, modelConfig, changeNotice } = useViewUpdate(props);

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
                        button
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
                        v-if="instance.currentActionAvailable"
                        :form="instance.formId"
                        label="Update"
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
                            Update
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
            <!-- @slot [record-name] Override the heading that names the record above the form; receives `recordName` (the fetched object's formatted name, empty when there is none) and `pending` (true while the name is loading). -->
            <slot name="record-name" :record-name="instance.recordName" :pending="instance.recordNamePending">
                <skeleton
                    v-if="instance.recordNamePending"
                    :class="theme('recordNameSkeleton')"
                    data-qa="record-name-skeleton"
                />
                <h2 v-else-if="instance.recordName" :class="theme('recordName')" data-qa="record-name">
                    {{ instance.recordName }}
                </h2>
            </slot>
            <error-display
                :error="instance.combinedError"
                :errored="instance.combinedErrored"
                :ignore-form-validation-errors="true"
                :while-text="instance.combinedWhileText"
            />
            <!-- @slot [change-notice] Override the notice shown when someone else saves or deletes the record after it loads; receives `changed`, `deleted`, `reload` (discards the form's edits and loads the saved record), `edited` (whether the user has touched a field), and `verboseName`. Appears only after `setupObjectStreams()`. -->
            <slot
                v-if="changeNotice.changed || changeNotice.deleted"
                :changed="changeNotice.changed"
                :deleted="changeNotice.deleted"
                :edited="!!formContext.state.anyTouched"
                name="change-notice"
                :reload="changeNotice.reload"
                :verbose-name="modelConfig.config?.verboseName"
            >
                <Alert v-if="changeNotice.deleted" data-qa="update-deleted-notice" variant="destructive">
                    <AlertTitle>Deleted by someone else</AlertTitle>
                    <AlertDescription>
                        This {{ modelConfig.config?.verboseName || "record" }} was deleted after you opened it. Saving
                        will fail.
                    </AlertDescription>
                </Alert>
                <Alert v-else data-qa="update-changed-notice" variant="warning">
                    <AlertTitle>Saved by someone else</AlertTitle>
                    <AlertDescription>
                        This {{ modelConfig.config?.verboseName || "record" }} changed after you opened it. Reload to
                        see the saved values.
                        <template v-if="formContext.state.anyTouched">Reloading discards your edits.</template>
                    </AlertDescription>
                    <AlertActions>
                        <Button data-qa="update-changed-reload" type="button" @click="changeNotice.reload">
                            Reload
                        </Button>
                    </AlertActions>
                </Alert>
            </slot>
            <!-- @slot [update-unavailable] Override the notice shown instead of the form when the object's available_actions does not permit the current action; receives `app`, `model`, `pk`, and `verboseName` (the model config's verbose name, if any). -->
            <slot
                v-if="!instance.currentActionAvailable"
                :app="app"
                :model="model"
                name="update-unavailable"
                :pk="pk"
                :verbose-name="modelConfig.config?.verboseName"
            >
                <Alert data-qa="update-unavailable-notice" variant="warning">
                    <AlertTitle>Editing unavailable</AlertTitle>
                    <AlertDescription>
                        This {{ modelConfig.config?.verboseName || "record" }} can't be edited in its current state.
                    </AlertDescription>
                </Alert>
            </slot>
            <form v-else v-bind="$attrs" :id="instance.formId" @submit.prevent="objectForm.submit">
                <form-model v-bind="instance.combinedFormProps">
                    <template
                        v-for="(_, slot) in omit(slots, [
                            'form-confirm-dialog-warnings',
                            'warning-entry',
                            'update-unavailable',
                            'change-notice',
                            'record-name',
                        ])"
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
                        <template v-if="slots['warning-entry']" #entry="entrySlotProps">
                            <slot name="warning-entry" v-bind="entrySlotProps" />
                        </template>
                    </FieldWarningsList>
                </slot>
            </template>
        </form-confirm-dialog>
    </div>
</template>

<style scoped></style>
