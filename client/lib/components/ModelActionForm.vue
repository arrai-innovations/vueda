<script setup>
import ActionForm from "@vueda/components/ActionForm.vue";
import FormChores from "@vueda/components/FormChores.vue";
import FormField from "@vueda/fields/FormField.vue";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { getLowerTitle, getPluralizedTitle } from "@vueda/utils/case.js";
import { DETAIL_VIEW_CRUD_NAME, LIST_VIEW_CRUD_NAME } from "@vueda/utils/constants.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { getDetailUrl, getListUrl } from "@vueda/utils/urls.js";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";
import omit from "lodash-es/omit.js";
import startCase from "lodash-es/startCase.js";
import { computed, inject, toRef, unref, useSlots } from "vue";
import { useRoute, useRouter } from "vue-router";

/**
 * Wraps `ActionForm` to execute a named action (such as delete or a custom
 * bulk operation) against one or more model instances. It displays the
 * selected objects, a confirmation message, and handles submission, dry-run
 * validation, and post-action redirect to the appropriate list or detail view.
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
    /** Django model name the action targets. */
    model: {
        type: String,
        required: true,
    },
    /** Action identifier (e.g. `"delete"` or a custom action name) sent to the server. */
    action: {
        type: String,
        required: true,
    },
    /** Human-readable action name shown in confirmation and result messages; defaults to a title-cased version of `action`. */
    actionVerboseName: {
        type: String,
        default: undefined,
    },
    /** Toast summary shown on successful action completion; auto-generated from the action and model name if omitted. */
    actionSuccessSummary: {
        type: String,
        default: undefined,
    },
    /** Toast summary shown when the action fails; auto-generated from the action and model name if omitted. */
    actionErrorSummary: {
        type: String,
        default: undefined,
    },
    /** Confirmation message shown to the user before submitting; auto-generated from the action and model name if omitted. */
    confirmMessage: {
        type: String,
        default: undefined,
    },
    /** Reactive fetch state object providing the list of selected objects and their data. */
    fetchState: {
        type: Object,
        default: undefined,
    },
    /** Optional function to transform form values before they are sent in the request body. */
    transformSubmitDataFn: {
        type: Function,
        default: undefined,
    },
    /** HTTP method used for the action request (ignored for destroy actions, which always use DELETE). */
    requestMethod: {
        type: String,
        default: "PUT",
    },
    /** When true, performs a dry-run validation request before the final submission. */
    enableDryRun: {
        type: Boolean,
        default: true,
    },
});
const formContext = inject(FormContextSymbol);

const router = useRouter();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

const actionSuccessSummaryComputed = computed(() => {
    if (props.actionSuccessSummary) {
        return props.actionSuccessSummary;
    }
    return startCase(`${unref(computedActionVerboseNameLowerCase)} ${unref(modelVerboseName)} successful`);
});
const actionErrorSummaryComputed = computed(() => {
    if (props.actionErrorSummary) {
        return props.actionErrorSummary;
    }
    return `Failed to ${props.action} ${props.model} `;
});

const pks = computed(() => props.fetchState?.objectsInOrder?.map((obj) => obj.id));
const pksAsString = computed(() => unref(pks)?.map((pk) => pk.toString()));
const bulk = computed(() => unref(pks)?.length > 1);

const modelVerboseName = computed(() =>
    unref(bulk)
        ? modelConfig.info?.verboseNamePlural || getLowerTitle(getPluralizedTitle(props.model))
        : modelConfig.info?.verboseName || getLowerTitle(props.model),
);

const computedActionVerboseNameLowerCase = computed(() => {
    return props.actionVerboseName?.length > 0 ? props.actionVerboseName : getLowerTitle(props.action);
});

const computedConfirmMessage = computed(
    () =>
        `Are you sure you want to ${unref(computedActionVerboseNameLowerCase)} the selected ${unref(modelVerboseName)}?`,
);

const route = useRoute();
const redirectTo = async (result) => {
    const returnPath = route.query?.returnPath;
    if (returnPath && typeof returnPath === "string") {
        await router.push(returnPath);
        return;
    }

    const redirects = modelConfig.config.actionRedirects || {};
    let redirect = redirects[props.action];
    if (redirect === undefined) {
        redirect = redirects.default;
    }
    if (typeof redirect === "function") {
        redirect = redirect({ bulk: unref(bulk), result });
    }

    if (unref(bulk) || redirect === "list") {
        await router.push({
            name: LIST_VIEW_CRUD_NAME,
            params: { app: props.app, model: props.model, action: "list" },
        });
    } else {
        await router.push({
            name: DETAIL_VIEW_CRUD_NAME,
            params: { app: props.app, model: props.model, action: redirect, pk: pks.value[0] },
        });
    }
};
const defaultRunAction = ({ formValues, dryRun }) => {
    const isDestroy = props.action === "destroy";
    const headers = {
        "X-CSRFToken": getCSRFValue(),
        "Content-Type": "application/json",
    };
    if (dryRun) {
        headers["Dry-Run"] = "true";
    }
    return fetchHelper(
        unref(bulk)
            ? getListUrl({ app: props.app, model: props.model, action: props.action })
            : getDetailUrl({ app: props.app, model: props.model, pk: pks.value[0], action: props.action }),
        {
            method: isDestroy ? "DELETE" : props.requestMethod,
            headers,
            body: (() => {
                const formData = props.transformSubmitDataFn ? props.transformSubmitDataFn(formValues) : undefined;

                if (unref(bulk)) {
                    return JSON.stringify({ pks: unref(pks), ...(formData || {}) });
                }

                return formData ? JSON.stringify(formData) : undefined;
            })(),
        },
        "Failed to execute action",
        (message, response, data) => {
            if (response.status === 400) {
                return new FormValidationError(data, response);
            }
            return new FetchError(message, response, data);
        },
    );
};
const theme = useTheme("ModelActionForm", props);
const slots = useSlots();
const dryRun = computed(
    () => !!(props.app && props.model && props.action && props.enableDryRun && pks.value.length > 0),
);
</script>

<template>
    <action-form
        :fetch-state="fetchState"
        :redirect-to="redirectTo"
        :run-action="defaultRunAction"
        :ready-to-dry-run="dryRun"
        v-bind="$attrs"
        :action-error-summary="actionErrorSummaryComputed"
        :action-success-summary="actionSuccessSummaryComputed"
    >
        <template v-for="(_, slot) in omit(slots, ['action-form-inner'])" #[slot]="slotProps">
            <slot :name="slot" v-bind="slotProps || {}" />
        </template>
        <template #action-form-inner="{ combinedLoading }">
            <div :class="theme('selectedObjects')" data-qa="action-form-selected-objects">
                <!-- @slot [selected-objects] Override the list of selected objects shown above the confirmation form. -->
                <slot
                    :loading="combinedLoading"
                    name="selected-objects"
                    :objects="fetchState?.objectsMap"
                    :pks="pksAsString"
                    :theme="theme"
                >
                    <p>You have selected the following {{ unref(modelVerboseName) }}:</p>
                    <div v-if="combinedLoading">
                        <p>Loading objects...</p>
                    </div>
                    <ul v-else :class="theme('list')" data-qa="action-form-list">
                        <li
                            v-for="pk in pksAsString"
                            :key="pk"
                            :class="theme('listItem')"
                            data-qa="action-form-list-item"
                        >
                            <form-field :field-value="pk" :label="pk" :name="pk" :read-only="true">
                                <widget-read-only
                                    :app="app"
                                    :foreign-key-obj="fetchState.objectsMap.get(pk)"
                                    :hidden="true"
                                    :invalid="false"
                                    :loading="combinedLoading"
                                    :model="model"
                                    :warning="false"
                                >
                                    <template #link-item="linkItemSlotProps">
                                        <!-- @slot [link-item] Override the link rendered for each selected object in the default list. -->
                                        <slot name="link-item" v-bind="linkItemSlotProps" />
                                    </template>
                                </widget-read-only>
                                <form-chores />
                            </form-field>
                        </li>
                    </ul>
                </slot>
            </div>
            <div :class="theme('message')" data-qa="action-form-message">
                <!-- @slot [confirm-error-message] Override the error message shown when the action has validation errors. -->
                <slot v-if="formContext.state.anyError" name="confirm-error-message">
                    <p>Please see the error message above.</p>
                </slot>
                <!-- @slot [confirm-message] Override the confirmation prompt shown before submitting. -->
                <slot v-else name="confirm-message">
                    <p>{{ computedConfirmMessage }}</p>
                </slot>
            </div>
        </template>
    </action-form>
</template>
