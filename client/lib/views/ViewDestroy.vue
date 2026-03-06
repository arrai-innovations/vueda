<script setup>
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import ModelActionForm from "@vueda/components/ModelActionForm.vue";
import { useViewDestroy } from "@vueda/use/useViewDestroy.js";
import isEmpty from "lodash-es/isEmpty.js";

/**
 * View that permanently deletes one or more model instances, presenting a confirmation form via
 * ModelActionForm before executing the delete action.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name whose instances will be permanently deleted. */
    model: {
        type: String,
        required: true,
    },
    /** Primary key or array of primary keys identifying the instances to delete. */
    pk: {
        type: [String, Array],
        required: true,
    },
    /** Visual variant passed through to the underlying action form. */
    variant: {
        type: String,
        default: "default",
    },
    /** Additional CSS classes applied to the outer wrapper element. */
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});

const { modelConfig, handleDelete, instanceList } = useViewDestroy(props);
</script>

<template>
    <div v-if="!isEmpty(modelConfig.info)">
        <model-action-form
            action="destroy"
            :app="app"
            :model="model"
            :pk="pk"
            :run-action="handleDelete"
            :fetch-state="instanceList.state"
            v-bind="$attrs"
        >
        </model-action-form>
    </div>
    <div v-else><loading-spinner-block /></div>
</template>
