<script setup>
import PageTitle from "@vueda/components/PageTitle.vue";
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useModelConfig } from "@vueda/use/useModelConfig";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { capitalize } from "lodash-es";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { computed, toRef } from "vue";
import { useRouter } from "vue-router";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    objects: {
        type: Array,
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
    state: {
        type: Object,
        default: () => {},
    },
    ...THEME_OVERRIDE_PROPS,
});
const toast = useToast();
const router = useRouter();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

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

const handleConfirm = async () => {
    await props.runAction();
    if (props.state.errored) {
        toast.add({
            severity: "error",
            summary: actionErrorSummary,
            detail: props.state.error,
            life: 5000,
        });
        return;
    } else {
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
    }
};

const confirmMessage = computed(() => {
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
                <ul class="list-inside ...">
                    you have selected the following item(s) for action:
                    <li v-for="object in props.objects" :key="object.id">
                        <p>{{ object.formatted_name || object.id }}</p>
                    </li>
                </ul>

                <slot name="confirm-message">
                    <p>{{ props.confirmMessage || confirmMessage }}</p>
                </slot>
            </div>
            <div :class="theme('buttonGroup')">
                <slot name="confirm" @click="handleConfirm">
                    <Button @click="handleConfirm"> Yes, continue </Button>
                </slot>
                <slot name="cancel" @click="router.back()">
                    <Button @click="router.back()"> Cancel </Button>
                </slot>
            </div>
        </div>

        <slot name="action-footer"> </slot>
    </div>
</template>
