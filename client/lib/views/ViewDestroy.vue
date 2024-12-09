<script setup>
import ActionForm from "@vueda/components/ActionForm.vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import { useViewDestroy } from "@vueda/use/useViewDestroy.js";
import isEmpty from "lodash-es/isEmpty.js";

defineOptions({
    inheritAttrs: false,
});
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
        type: [String, Array],
        required: true,
    },
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});

const { modelConfig, handleDelete, instanceList } = useViewDestroy(props);
</script>

<template>
    <div v-if="!isEmpty(modelConfig.info)">
        <action-form
            action="destroy"
            :app="app"
            :model="model"
            :pk="pk"
            :run-action="handleDelete"
            :state="instanceList.state"
        >
        </action-form>
    </div>
    <div v-else><loading-spinner-block /></div>
</template>
