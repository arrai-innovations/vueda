<script setup>
import { useModelConfig } from "@vueda/use/useModelConfig";
import ViewActionNotFound from "@vueda/views/ViewActionNotFound.vue";
import ViewLoading from "@vueda/views/ViewLoading.vue";
import { computed, toRef } from "vue";

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
        type: String,
        required: true,
    },
    action: {
        type: String,
        required: true,
    },
});

const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

const componentToRender = computed(() => {
    if (modelConfig.loading) {
        return ViewLoading;
    }
    const action = (modelConfig?.info || { actions: [] })?.actions.find((action) => action.name === props.action);
    if (!action) {
        return ViewActionNotFound;
    }
    // todo: this is hopium
    return action.component;
});
</script>

<template>
    <!-- todo: this is hopium -->
    <component :is="componentToRender" :action="action" :app="app" :model="model" :pk="pk" />
</template>
