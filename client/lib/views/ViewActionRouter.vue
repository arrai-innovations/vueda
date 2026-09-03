<script setup>
import { crudComponents } from "@vueda/router/routerComponent.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { getActionName } from "@vueda/utils/actionMap.js";
import { getPascalCaseName } from "@vueda/utils/case.js";
import ViewAction from "@vueda/views/ViewAction.vue";
import ViewActionNotFound from "@vueda/views/ViewActionNotFound.vue";
import ViewExecuteTransition from "@vueda/views/ViewExecuteTransition.vue";
import ViewLoading from "@vueda/views/ViewLoading.vue";
import { computedAsync } from "@vueuse/core";
import { ref, toRef, watch } from "vue";

/**
 * Resolves the correct view component for a given model action at runtime, delegating to CRUD
 * views, workflow transition views, or dynamically imported custom action views as appropriate.
 */
defineOptions({});

const props = defineProps({
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name whose action should be resolved. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key(s) forwarded to the resolved action view. */
    pk: {
        type: [String, Number, Array],
        default: "",
    },
    /** Name of the action to resolve and render. */
    action: {
        type: String,
        required: true,
    },
});
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const workflow = useWorkflowTransitions(toRef(props, "app"), toRef(props, "model"));
const getExtraActionComponent = async (action, fallback) => {
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
            return fallback;
        }
    }
};
/** @type {import('vue').Ref<Promise<import('vue').Component>|()=>import('vue').Component>} */
const actionComponentRef = ref(() => ViewLoading);
watch(
    [() => modelConfig.loading, () => props.action, () => modelConfig.info?.actions, () => workflow.transitions],
    async ([loading, actionStr, actionsObj, transitionObjects]) => {
        const actionName = getActionName(actionStr);
        if (loading) {
            actionComponentRef.value = () => ViewLoading;
        } else if (!actionsObj && !transitionObjects) {
            actionComponentRef.value = () => ViewActionNotFound;
        } else if (actionsObj?.length || transitionObjects?.length) {
            const action = actionsObj.find((action) => action.name === actionName);
            const transition = transitionObjects.find((transition) => transition.code === actionName);
            if (!action && !transition) {
                actionComponentRef.value = () => ViewActionNotFound;
            } else if (!transition && Object.keys(crudComponents).includes(actionStr)) {
                // Gated on !transition so a transition code that happens to collide with a
                // crudComponents key (a default key, or one a project registered via
                // setCrudComponents) is never shadowed by that registry entry. A transition always
                // resolves through the naming-convention imports and the ViewExecuteTransition
                // fallback below instead.
                actionComponentRef.value = async () => await crudComponents[actionStr](props);
            } else {
                // A recognized transition code falls back to ViewExecuteTransition (submits through
                // storeWorkflow.executeTransition); every other recognized action falls back to the
                // generic ViewAction. Either fallback still yields to a project-supplied
                // ViewAction{App}{Model}{Code}.vue or ViewAction{Code}.vue override.
                const fallback = transition ? ViewExecuteTransition : ViewAction;
                actionComponentRef.value = async () => await getExtraActionComponent(actionStr, fallback);
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
