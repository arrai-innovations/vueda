<script setup>
import { crudComponents } from "@vueda/router/routerComponent.js";
<<<<<<< HEAD
import { useModelInfo } from "@vueda/use/useModelInfo.js";
=======
import { useModelConfig } from "@vueda/use/useModelConfig";
import { getPascalCaseName } from "@vueda/utils/crudSupport.js";
>>>>>>> b46036b (wip: change to use bulk flag on actions and update objectsDelete)
import ViewActionNotFound from "@vueda/views/ViewActionNotFound.vue";
import ViewLoading from "@vueda/views/ViewLoading.vue";
import ViewWorkFlowTransition from "@vueda/views/ViewWorkFlowTransition.vue";
import { computedAsync } from "@vueuse/core";
import { ref, toRaw, toRef, watch } from "vue";

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

<<<<<<< HEAD
const modelInfo = useModelInfo(toRef(props, "app"), toRef(props, "model"));
/** @type {import('vue').Ref<Promise<import('vue').Component>|()=>import('vue').Component>} */
const actionComponentRef = ref(() => ViewLoading);
watch(
    [() => modelInfo.loading, () => props.action, () => modelInfo.info?.actions],
    async ([loading, actionStr, actionsObj]) => {
        if (loading) {
            actionComponentRef.value = () => ViewLoading;
        } else if (actionStr === "transition") {
            actionComponentRef.value = () => ViewWorkFlowTransition;
        } else if (!actionsObj) {
            actionComponentRef.value = () => ViewActionNotFound;
        } else if (actionsObj?.length) {
            const action = actionsObj.find((action) => action.name === actionStr);
            if (!action) {
                actionComponentRef.value = () => ViewActionNotFound;
            }
            const actionName = toRaw(action).name === "bulk-delete" ? "delete" : toRaw(action).name;
            if (Object.keys(crudComponents).includes(actionName)) {
                actionComponentRef.value = async () => await crudComponents[actionName](props);
            } else {
                actionComponentRef.value = () => ViewNotFound;
            }
        }
    },
    { immediate: true, deep: true },
);
const actionComponent = computedAsync(async () => {
    return actionComponentRef.value();
=======
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const crudViews = ["list", "create", "update", "read", "delete"];

const getExtraActionComponent = async (action) => {
    try {
        return (
            await import(
                `@/views/View${getPascalCaseName(props.app)}${getPascalCaseName(props.model)}${getPascalCaseName(action)}Action.vue`
            )
        ).default;
    } catch (e) {
        return ViewActionNotFound;
    }
};

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
    const actionName = toRaw(action).name === "destroy" ? "delete" : toRaw(action).name;
    if (crudViews.includes(actionName)) {
        return await crudComponents[actionName](props);
    }
    return await getExtraActionComponent(actionName);
>>>>>>> b46036b (wip: change to use bulk flag on actions and update objectsDelete)
}, null);
</script>

<template>
    <component :is="actionComponent" v-if="actionComponent" :app="app" :model="model" :pk="pk" />
</template>
