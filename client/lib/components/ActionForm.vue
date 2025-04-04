<script setup>
import { loadingCombine } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FormChores from "@vueda/components/FormChores.vue";
import FieldString from "@vueda/fields/FieldString.vue";
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useModelConfig } from "@vueda/use/useModelConfig";
import { defaultOnSubmissionError } from "@vueda/use/useObjectForm.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import {
    DETAIL_VIEW_CRUD_NAME,
    LIST_VIEW_CRUD_NAME,
    getLowerTitle,
    getPluralizedTitle,
} from "@vueda/utils/crudSupport.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { getDetailUrl, getListUrl } from "@vueda/utils/urls.js";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";
import isObject from "lodash-es/isObject.js";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { computed, inject, onDeactivated, onUnmounted, reactive, toRef, unref } from "vue";
import { useRoute, useRouter } from "vue-router";

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
    action: {
        type: String,
        required: true,
    },
    actionVerboseName: {
        type: String,
        default: undefined,
    },
    runAction: {
        type: Function,
        default: undefined,
    },
    handleActionCompletion: {
        type: Function,
        default: undefined,
    },
    actionSuccessSummary: {
        type: String,
        default: undefined,
    },
    actionErrorSummary: {
        type: String,
        default: undefined,
    },
    confirmMessage: {
        type: String,
        default: undefined,
    },
    fetchState: {
        type: Object,
        default: () => ({ errored: false, error: null, loading: undefined }),
    },
    submitFormValues: {
        type: Function,
        default: undefined,
    },
    requestMethod: {
        type: String,
        default: "PUT",
    },
    ...THEME_OVERRIDE_PROPS,
});
const toast = useToast();
const router = useRouter();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

const actionState = reactive({
    loading: false,
    errored: false,
    error: null,
});
const combinedError = computed(() => {
    return props.fetchState.error || actionState.error;
});
const combinedErrored = computed(() => !!combinedError.value);
const combinedLoading = computed(() => loadingCombine(props.fetchState.loading, actionState.loading));
const actionSuccessSummary = computed(() => {
    if (props.actionSuccessSummary) {
        return props.actionSuccessSummary;
    }
    return `${props.model} ${props.action} successful`;
});
const actionErrorSummary = computed(() => {
    if (props.actionErrorSummary) {
        return props.actionErrorSummary;
    }
    return `Failed to ${props.action} ${props.model} `;
});

const pks = computed(() => props.fetchState?.objectsInOrder?.map((obj) => obj.id));
const pksAsString = computed(() => unref(pks)?.map((pk) => pk.toString()));
const bulk = computed(() => unref(pks)?.length > 1);

const defaultRunAction = (action) => {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    let method = props.requestMethod;
    if (action === "destroy") {
        method = "DELETE";
        action = undefined;
    }
    const controller = new AbortController();
    let body = props.submitFormValues ? props.submitFormValues(formContext.state.submittingValues) : undefined;

    if (unref(bulk)) {
        body = { pks: unref(pks), ...(body || {}) };
    }
    const url = unref(bulk)
        ? getListUrl({ app: props.app, model: props.model, action })
        : getDetailUrl({
              app: props.app,
              model: props.model,
              pk: pks.value[0],
              action,
          });
    /** @type {Promise<void> & { cancel: () => Promise<void> }} */
    const returnPromise = fetch(url, {
        method,
        headers: {
            "X-CSRFToken": getCSRFValue(),
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
    }).then(async (response) => {
        const responseData = await getJsonOrText(response);
        if (!isObject(responseData)) {
            throw new FetchError("Failed to execute action", response, responseData);
        }
        if (response.status === 200) {
            return responseData;
        }
        if (response.status === 400) {
            throw new FormValidationError(responseData, response);
        }
        throw new FetchError("Failed to create object", response, responseData);
    });

    returnPromise.cancel = async () => {
        controller.abort();
        await returnPromise.catch(() => {});
    };

    return returnPromise;
};
const runAction = computed(() => props.runAction || defaultRunAction);
const formContext = inject(FormContextSymbol, null);
let actionPromise = null;
const handleConfirm = async () => {
    actionState.loading = true;
    actionState.errored = false;
    actionState.error = null;
    try {
        formContext.setAllTouched();
        if (formContext.state.anyError) {
            return;
        }

        actionPromise = unref(runAction)(props.action);
        await actionPromise;
        toast.add({
            severity: "success",
            summary: actionSuccessSummary,
            life: 5000,
        });
        if (props.handleActionCompletion) {
            await props.handleActionCompletion();
        } else {
            await goBack();
        }
    } catch (error) {
        const handled = await defaultOnSubmissionError({ error, formContext, toast });
        if (!handled) {
            actionState.errored = true;
            actionState.error = error;
            toast.add({
                severity: "error",
                summary: actionErrorSummary,
                detail: actionState.error,
                life: 5000,
            });
        }
    } finally {
        actionPromise = null;
        actionState.loading = false;
    }
};

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

const theme = useTheme("ActionForm", props);

onDeactivated(() => {
    if (actionPromise) {
        actionPromise.cancel?.();
    }
});
onUnmounted(() => {
    if (actionPromise) {
        actionPromise.cancel?.();
    }
});
const handleCancelClick = async (e) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    // router.back() is not great, as the url could be hit from an email or otherwise off-site.
    if (unref(bulk)) {
        // if we are bulk, let's redirect back to the list view for this model.
        await router.push(
            await getCRUDForTo({
                app: props.app,
                model: props.model,
                view: "list",
            }),
        );
    } else {
        await goBack();
    }
};
const route = useRoute();
const goBack = async () => {
    const returnPath = route.query?.returnPath;
    if (returnPath && typeof returnPath === "string") {
        await router.push(returnPath);
        return;
    }
    if (unref(bulk)) {
        await router.push({
            name: LIST_VIEW_CRUD_NAME,
            params: { app: props.app, model: props.model, action: "list" },
        });
    } else {
        await router.push({
            name: DETAIL_VIEW_CRUD_NAME,
            params: { app: props.app, model: props.model, action: modelConfig.config.defaultView, pk: pks.value[0] },
        });
    }
};
</script>

<template>
    <error-display :error="combinedError" :errored="combinedErrored" :ignore-form-validation-errors="true" />
    <div :class="theme('root')" data-qa="action-form-root">
        <div :class="theme('inner')" data-qa="action-form-inner">
            <form-chores :class="theme('nonFieldErrorBlock')" :variant="null" />
            <div :class="theme('selectedObjects')" data-qa="action-form-selected-objects">
                <slot
                    :loading="combinedLoading"
                    name="selected-objects"
                    :objects="fetchState?.objects"
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
                            <field-string :field-value="pk" :label="pk" :name="pk">
                                <widget-read-only
                                    :app="app"
                                    :foreign-key-obj="fetchState.objects[pk]"
                                    :hidden="true"
                                    :invalid="false"
                                    :loading="combinedLoading"
                                    :model="model"
                                    :warning="false"
                                >
                                    <template #link-item="slotProps">
                                        <slot name="link-item" v-bind="slotProps" />
                                    </template>
                                </widget-read-only>
                                <form-chores />
                            </field-string>
                        </li>
                    </ul>
                </slot>
            </div>
            <div :class="theme('message')" data-qa="action-form-message">
                <slot name="confirm-message">
                    <p>{{ computedConfirmMessage }}</p>
                </slot>
            </div>
            <div :class="theme('buttons')" data-qa="action-form-buttons">
                <slot
                    label="Yes, continue"
                    :loading="combinedLoading"
                    name="confirm-button"
                    verb="confirm"
                    @click="handleConfirm"
                >
                    <Button :loading="combinedLoading" @click="handleConfirm">Yes, continue</Button>
                </slot>
                <slot label="Cancel, go back" name="cancel-button" verb="cancel" @click="handleCancelClick">
                    <Button label="Cancel, go back" @click="handleCancelClick" />
                </slot>
            </div>
        </div>
    </div>
</template>
