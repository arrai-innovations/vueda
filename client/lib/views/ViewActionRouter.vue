<script setup>
import { crudComponents } from "@vueda/router/routerComponent.js";
import { useModelConfig } from "@vueda/use/useModelConfig";
import ViewActionNotFound from "@vueda/views/ViewActionNotFound.vue";
import ViewLoading from "@vueda/views/ViewLoading.vue";
import ViewNotFound from "@vueda/views/ViewNotFound.vue";
import ViewWorkFlowTransition from "@vueda/views/ViewWorkFlowTransition.vue";
import { computedAsync } from "@vueuse/core";
import { toRaw, toRef } from "vue";

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
        type: [String, Number, Array],
        default: "",
    },
    action: {
        type: String,
        required: true,
    },
});

const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const crudViews = ["list", "create", "update", "read", "delete"];

const actionComponent = computedAsync(async () => {
    if (modelConfig.loading) {
        return ViewLoading;
    }
    if (props.action === "transition") {
        return ViewWorkFlowTransition;
    }
    // TODO: get_model_actions(self, instance) sever side return action name retrieve which correspond to read
    const action = modelConfig?.info.actions?.find((action) => action.name === props.action);
    if (!action) {
        return ViewActionNotFound;
    }
    const actionName = toRaw(action).name === "bulk-delete" ? "delete" : toRaw(action).name;
    if (crudViews.includes(actionName)) {
        return await crudComponents[actionName](props);
    }
    return ViewNotFound;
}, null);
</script>

<template>
    <component :is="actionComponent" :app="app" :model="model" :pk="pk" />
</template>
