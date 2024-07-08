<script setup>
import { useModelConfig } from "../use/useModelConfig.js";
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
    view: {
        type: String,
        default: "list",
        // delete is handled as a detail action
    },
});
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
// todo: if an invalid app or model is passed, use a not found component
// todo: use the modelConfig to lookup custom props to be passed to the view
const viewComponent = computed(() => {
    return modelConfig.views[props.view].component;
});
const viewProps = computed(() => {
    return {
        app: props.app,
        model: props.model,
        ...modelConfig.views[props.view].props,
    };
});
</script>

<template>
    <component :is="viewComponent" v-bind="viewProps" />
</template>

<style scoped></style>
