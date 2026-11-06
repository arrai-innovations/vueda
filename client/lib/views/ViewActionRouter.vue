<script setup>
import { crudComponents } from "@vueda/router/routerComponent.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { getActionName } from "@vueda/utils/actionMap.js";
import { getPascalCaseName } from "@vueda/utils/case.js";
import { reportProjectViewLoadError, warnUnmatchedProjectViews } from "@vueda/utils/projectViewOverrides.js";
import ViewAction from "@vueda/views/ViewAction.vue";
import ViewActionNotFound from "@vueda/views/ViewActionNotFound.vue";
import ViewExecuteTransition from "@vueda/views/ViewExecuteTransition.vue";
import ViewLoading from "@vueda/views/ViewLoading.vue";
import { shallowRef, toRef, watch } from "vue";

/**
 * Renders the view for the route's action from the project's `src/views` files, preferring a file named for the
 * route's model over a project-wide file. When no project file exists, it renders the VUEDA view. A loader that a
 * project registers with {@api js:function:@arrai-innovations/vueda/router/routerComponent#setCrudComponents}
 * replaces this lookup for a built-in action.
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
// Development builds list the project's view files, to check their names and to report a view that fails to
// load. The glob is root-relative because a glob through an `@` alias that the project does not define fails
// the build; `@` normally points at `<root>/src`. Production builds list no files.
const projectViewPaths = import.meta.env.DEV ? Object.keys(import.meta.glob("/src/views/View*.vue")) : [];
/**
 * @param {string[]} names
 * @param {() => (object|Promise<object>)} fallback
 * @returns {Promise<object>}
 */
const importProjectView = async (names, fallback) => {
    for (const name of names) {
        try {
            return (await import(`@/views/View${name}.vue`)).default;
        } catch (error) {
            reportProjectViewLoadError(projectViewPaths, `/src/views/View${name}.vue`, error);
        }
    }
    return fallback();
};
/**
 * @param {import("@vueda/router/routerComponent.js").ViewTarget} target
 * @returns {import("@vueda/router/routerComponent.js").ViewLoaderContext}
 */
const viewLoaderContext = ({ app, model }) => ({
    findProjectView: (name, fallback) =>
        importProjectView([`${name}${getPascalCaseName(app)}${getPascalCaseName(model)}`, name], fallback),
});
/**
 * @param {import("@vueda/router/routerComponent.js").ViewTarget} target
 * @param {string} genericName
 * @param {object} vuedaView
 * @returns {Promise<object>}
 */
const findActionView = ({ app, model, action }, genericName, vuedaView) =>
    importProjectView(
        [
            `Action${getPascalCaseName(app)}${getPascalCaseName(model)}${getPascalCaseName(action)}`,
            `Action${getPascalCaseName(action)}`,
            genericName,
        ],
        () => vuedaView,
    );
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
        if (import.meta.env.DEV && modelConfig.info?.actions) {
            // A file name is the only link between a project view and its route, so report one that matches
            // nothing.
            warnUnmatchedProjectViews(projectViewPaths, {
                app: target.app,
                model: target.model,
                actionNames: modelConfig.info.actions.map((action) => action.name),
                transitionCodes: (workflow.transitions || []).map((transition) => transition.code),
                registryKeys: Object.keys(crudComponents),
            });
        }
        const actionName = getActionName(target.action);
        const action = modelConfig.info?.actions?.find((action) => action.name === actionName);
        const transition = workflow.transitions?.find((transition) => transition.code === actionName);
        let component;
        if (!action && !transition) {
            component = ViewActionNotFound;
        } else if (!transition && Object.hasOwn(crudComponents, target.action)) {
            // A transition takes precedence over a registry entry with the same name.
            component = await crudComponents[target.action](target, viewLoaderContext(target));
        } else if (transition) {
            component = await findActionView(target, "ExecuteTransition", ViewExecuteTransition);
        } else {
            component = await findActionView(target, "Action", ViewAction);
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
