<script setup>
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useModelConfig } from "@vueda/use/useModelConfig";
import { isArray } from "lodash-es";
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
    model: {
        type: String,
        required: true,
    },
    pk: {
        type: [String, Array],
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
});
const toast = useToast();
const router = useRouter();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

const actionTitleText = computed(() => {
    if (Array.isArray(props.pk)) {
        return `${props.model} ${props.action} ${props.pk.map((p) => `#${p}`).join(", ")}`;
    }
    return `${props.model} ${props.action} #${props.pk}`;
});
const actionSuccessSummary = computed(() => {
    if (props.actionSuccessSummary) {
        return props.actionSuccessSummary;
    }
    if (Array.isArray(props.pk)) {
        return `${props.model} ${props.action} ${props.pk.map((p) => `#${p}`).join(", ")} successful`;
    }
    return `${props.model} ${props.action} #${props.pk} successful`;
});
const actionErrorSummary = computed(() => {
    if (props.actionErrorSummary) {
        return props.actionErrorSummary;
    }
    return `Fail to ${props.action} ${props.model} }`;
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
    if (isArray(props.pk)) {
        return `Are you sure you want to ${props.action} these ${modelConfig.info?.verbose_name_plural || props.model}?`;
    }
    return `Are you sure you want to ${props.action} this ${modelConfig.info?.verbose_name || props.model}?`;
});
</script>

<template>
    <div>
        <slot name="action-title">
            <h1>{{ props.title || actionTitleText }}</h1>
        </slot>
        <slot name="action-body">
            <p>{{ props.confirmMessage || confirmMessage }}</p>
            <!-- todo: show the item(s) somehow. -->
            <Button @click="handleConfirm"> Yes, continue </Button>
            <Button @click="router.back()"> Cancel </Button>
        </slot>
        <slot name="action-footer"> </slot>
    </div>
</template>
