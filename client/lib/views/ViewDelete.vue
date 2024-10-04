<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import ActionForm from "@vueda/components/ActionForm.vue";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig";
import { isArray } from "lodash-es";
import isEmpty from "lodash-es/isEmpty.js";
import { computed, reactive, toRef } from "vue";

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

const isActive = useIsActive();
const validAndActive = computed(
    () => !!(isActive.value && props.app && props.model && props.pk && modelConfig.info?.pk),
);
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

const instanceListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    retrieveArgs: {
        f: {},
    },
    listArgs: {
        id: isArray(toRef(props, "pk")) ? toRef(props, "pk") : [toRef(props, "pk")],
    },
    intendToList: validAndActive,
});
const instanceList = useList({
    props: instanceListProps,
    paged: false,
    keepOldPages: false,
    clearListOnListIntentTriggered: false,
});

const handleDelete = async () => {
    await instanceList.bulkDelete();
};
</script>

<template>
    <!-- todo: this is a placeholder. this could be a modal from the origin page. -->
    <!--  however, if we keep it as a separate page, that gives us more room to add more features -->
    <!--  like mass delete, etc. -->
    <div v-if="!isEmpty(modelConfig.info)">
        <action-form
            action="delete"
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
