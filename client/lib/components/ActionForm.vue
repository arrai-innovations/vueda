<script setup>
import { loadingCombine } from "@arrai-innovations/reactive-helpers";
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useModelConfig } from "@vueda/use/useModelConfig";
import { defaultOnSubmissionError } from "@vueda/use/useObjectForm.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { getLowerTitle, getPluralizedTitle } from "@vueda/utils/crudSupport.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { getDetailUrl, getListUrl } from "@vueda/utils/urls.js";
import { isObject } from "lodash-es";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { computed, inject, onDeactivated, onUnmounted, reactive, toRef, unref } from "vue";
import { useRouter } from "vue-router";

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
const bulk = computed(() => unref(pks)?.length > 1);

const defaultRunAction = (action) => {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const controller = new AbortController();
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
        method: "PUT",
        headers: {
            "X-CSRFToken": getCSRFValue(),
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: unref(bulk) ? JSON.stringify({ pks: unref(pks) }) : undefined,
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
        actionPromise = unref(runAction)(props.action);
        await actionPromise;
        toast.add({
            severity: "success",
            summary: actionSuccessSummary,
            life: 5000,
        });
        await router.push(
            await getCRUDForTo({
                app: props.app,
                model: props.model,
                view: "list",
            }),
        );
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
        actionState.loading = false;
    }
};

const modelVerboseName = computed(() =>
    unref(bulk)
        ? modelConfig.info?.verbose_name_plural || getLowerTitle(getPluralizedTitle(props.model))
        : modelConfig.info?.verbose_name || getLowerTitle(props.model),
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
        actionPromise.cancel();
    }
});
onUnmounted(() => {
    if (actionPromise) {
        actionPromise.cancel();
    }
});
</script>

<template>
    <div :class="theme('root')">
        <div :class="theme('inner')">
            <div :class="theme('selectedObjects')">
                <slot :loading="combinedLoading" name="selected-objects" :objects="fetchState.objects">
                    <p>You have selected the following item(s):</p>
                    <div v-if="combinedLoading">
                        <p>Loading objects...</p>
                    </div>
                    <ul v-else class="list-inside">
                        <li v-for="object in fetchState.objects" :key="object.id">
                            {{ object.formatted_name || object.id }}
                        </li>
                    </ul>
                </slot>
            </div>
            <div :class="theme('message')">
                <slot name="confirm-message">
                    <p>{{ computedConfirmMessage }}</p>
                </slot>
            </div>
            <div :class="theme('buttons')">
                <slot
                    label="Yes, continue"
                    :loading="combinedLoading"
                    name="confirm-button"
                    verb="confirm"
                    @click="handleConfirm"
                >
                    <Button :loading="combinedLoading" @click="handleConfirm">Yes, continue</Button>
                </slot>
                <slot
                    label="Cancel"
                    :loading="actionState.loading"
                    name="cancel-button"
                    verb="cancel"
                    @click="router.back()"
                >
                    <Button label="Cancel" :loading="actionState.loading" @click="router.back()" />
                </slot>
            </div>
        </div>
    </div>
</template>
