<script setup>
import { crudComponents } from "@vueda/router/routerComponent.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { getPascalCaseName } from "@vueda/utils/crudSupport.js";
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
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const getExtraActionComponent = async (action) => {
    try {
        // by app, model and action
        return (
            await import(
                `@/views/ViewAction${getPascalCaseName(props.app)}${getPascalCaseName(props.model)}${getPascalCaseName(action)}.vue`
            )
        ).default;
    } catch (e) {
        try {
            // by action
            return (await import(`@/views/ViewAction${getPascalCaseName(action)}.vue`)).default;
        } catch (e) {
            // no extra action component found
            return ViewActionNotFound;
        }
    }
};
/** @type {import('vue').Ref<Promise<import('vue').Component>|()=>import('vue').Component>} */
const actionComponentRef = ref(() => ViewLoading);
watch(
    [() => modelConfig.loading, () => props.action, () => modelConfig.info?.actions],
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
            const actionName = toRaw(action).name;
            if (Object.keys(crudComponents).includes(actionName)) {
                actionComponentRef.value = async () => await crudComponents[actionName](props);
            } else {
                actionComponentRef.value = async () => await getExtraActionComponent(actionName);
            }
        }
    },
    { immediate: true, deep: true },
);

const actionComponent = computedAsync(async () => {
    return actionComponentRef.value();
}, null);
</script>

<template>
    <component :is="actionComponent" v-if="actionComponent" :action="action" :app="app" :model="model" :pk="pk" />
</template>
