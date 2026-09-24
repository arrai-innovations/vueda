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
import { shallowRef, toRef, watch } from "vue";

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
const getExtraActionComponent = async ({ app, model, action }, fallback) => {
    try {
        // by app, model and action
        return (
            await import(
                `@/views/ViewAction${getPascalCaseName(app)}${getPascalCaseName(model)}${getPascalCaseName(action)}.vue`
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
// Resolve the component and its props together. Until both are ready, the current
// view keeps its previous target rather than receiving a different model's props.
const snapshotProps = () => ({ ...props, pk: Array.isArray(props.pk) ? [...props.pk] : props.pk });
const resolvedView = shallowRef({ component: ViewLoading, props: snapshotProps() });
watch(
    [
        () => props.app,
        () => props.model,
        () => props.action,
        () => props.pk,
        () => modelConfig.loading,
        () => workflow.loading,
        () => modelConfig.info?.actions,
        () => workflow.transitions,
    ],
    async (_, __, onCleanup) => {
        let current = true;
        onCleanup(() => {
            current = false;
        });
        if (modelConfig.loading !== false || workflow.loading) {
            return;
        }

        const target = snapshotProps();
        const actionName = getActionName(target.action);
        const action = modelConfig.info?.actions?.find((action) => action.name === actionName);
        const transition = workflow.transitions?.find((transition) => transition.code === actionName);
        let component;
        if (!action && !transition) {
            component = ViewActionNotFound;
        } else if (!transition && Object.hasOwn(crudComponents, target.action)) {
            // A transition takes precedence over a registry entry with the same name.
            component = await crudComponents[target.action](target);
        } else {
            component = await getExtraActionComponent(target, transition ? ViewExecuteTransition : ViewAction);
        }
        // A later navigation or metadata refresh may have superseded this import.
        if (current) {
            resolvedView.value = { component, props: target };
        }
    },
    { immediate: true, deep: true },
);
</script>

<template>
    <component :is="resolvedView.component" v-bind="resolvedView.props" />
</template>
