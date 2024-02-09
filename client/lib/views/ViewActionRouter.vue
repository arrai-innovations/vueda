<script setup>
import { computed } from "vue";

defineProps({
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
const models = useModels();
const actions = useActions();
const modelData = computed(() => {
    return models.data?.[props.app]?.[props.model];
});
const actionData = computed(() => {
    if (actions.data[props.action]) {
        return actions.data[props.action];
    }
    return null;
});
const componentToRender = computed(() => {
    // render a loading component if the models are not yet loaded
    // or if the actions are not yet loaded
    if (models.loading || actions.loading) {
        return ViewLoading;
    }
    // render a not found component if the model is not found
    // or if the action is not found
    if (!modelData.value || !actionData.value) {
        return ViewNotFound;
    }
    if (!modelData.value.actions.includes(props.action)) {
        return ViewNotFound;
    }
    // render the component
    const model = models.data[props.model];
    const action = actions.data[props.action];
    return models.components[model.id][action.id];
});
</script>

<template>
    <component :is="componentToRender" :app="app" :model="model" :pk="pk" :action="action" />
</template>
