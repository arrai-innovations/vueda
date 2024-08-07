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
        default: undefined,
    },
    action: {
        type: String,
        required: true,
    },
});

const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const crudViews = ["list", "create", "update", "read", "delete"];

const actionComponent = computedAsync(async () => {
    // const workflow = storeWorkflow();
    // try {
    //   await workflow.fetchWorkflowTransition(props.app, props.model);
    //
    // } catch (WorkflowError) {
    //     debugger
    //     console.log("error")
    // }
    // // await workflow.fetchModelStates(props.app, props.model);
    // await workflow.fetchObjectTransitions(props.app, props.model, 45);
    // const a = workflow.workflowTransitions
    // console.log("@@@workflow", workflow.workflowTransitions);
    if (modelConfig.loading) {
        return ViewLoading;
    }
    if (props.action === "transaction") {
        return ViewWorkFlowTransition;
    }
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
    <component :is="actionComponent" :action="action" :app="app" :model="model" :pk="pk" />
</template>
