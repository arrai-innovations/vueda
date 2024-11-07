<script setup>
import { loadingCombine } from "@arrai-innovations/reactive-helpers";
import PageTitle from "@vueda/components/PageTitle.vue";
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useModelConfig } from "@vueda/use/useModelConfig";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { capitalize } from "lodash-es";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { computed, reactive, toRef } from "vue";
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
    runAction: {
        type: Function,
        required: true,
    },
    actionSuccessSummary: {
        type: String,
        default: undefined,
    },
    actionErrorSummary: {
        type: String,
        default: undefined,
    },
    title: {
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

const combinedLoading = computed(() => loadingCombine(props.fetchState.loading, props.actionState.loading));
const actionTitleText = computed(() => {
    return `${capitalize(props.action)} ${capitalize(props.model)}`;
});
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
    return `Fail to ${props.action} ${props.model} `;
});

const actionState = reactive({
    loading: false,
    errored: false,
    error: null,
});

const handleConfirm = async () => {
    actionState.loading = true;
    actionState.errored = false;
    actionState.error = null;
    try {
        await props.runAction();
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
        actionState.errored = true;
        actionState.error = error;
        toast.add({
            severity: "error",
            summary: actionErrorSummary,
            detail: actionState.error,
            life: 5000,
        });
    } finally {
        actionState.loading = false;
    }
};

const computedConfirmMessage = computed(() => {
    return `Are you sure you want to ${capitalize(props.action)} the selected ${modelConfig.info?.verbose_name || props.model}?`;
});

const theme = useTheme("ActionForm", props);
</script>

<template>
    <div :class="theme('root')">
        <slot name="action-title">
            <PageTitle :title="actionTitleText">
                <template #button>
                    <Button outlined text @click="router.back()"> Back </Button>
                </template>
            </PageTitle>
        </slot>
        <div :class="theme('inner')">
            <div :class="theme('bodyContainer')">
                <p>You have selected the following item(s) for action:</p>
                <div v-if="combinedLoading">
                    <p>Loading objects...</p>
                </div>
                <ul v-else class="list-inside">
                    <li v-for="object in fetchState.objects" :key="object.id">
                        <p>{{ object.formatted_name || object.id }}</p>
                    </li>
                </ul>

                <slot name="confirm-message">
                    <p>{{ confirmMessage || computedConfirmMessage }}</p>
                </slot>
            </div>
            <div :class="theme('buttonGroup')">
                <slot
                    label="Yes, continue"
                    :loading="combinedLoading"
                    name="confirm-button"
                    verb="confirm"
                    @click="handleConfirm"
                >
                    <Button :loading="combinedLoading" @click="handleConfirm">Yes, continue</Button>
                </slot>
                <slot label="Cancel" :loading="actionState.loading" name="cancel" verb="cancel" @click="router.back()">
                    <Button :loading="actionState.loading" @click="router.back()">Cancel</Button>
                </slot>
            </div>
        </div>

        <slot name="action-footer"> </slot>
    </div>
</template>
