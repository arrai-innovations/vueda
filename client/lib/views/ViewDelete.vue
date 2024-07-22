<script setup>
import { useList } from "@arrai-innovations/reactive-helpers";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig";
import { isArray } from "lodash-es";
import isEmpty from "lodash-es/isEmpty.js";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { computed, reactive, toRef } from "vue";
import { useRouter } from "vue-router";

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
const validAndActive = computed(() => !!(isActive.value && props.app && props.model && props.pk));
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

const instanceListProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
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
});
const toast = useToast();
const router = useRouter();

const handleDelete = async () => {
    await instanceList.bulkDelete();
    if (instanceList.state.errored) {
        toast.add({
            severity: "error",
            summary: "Delete Error",
            detail: `Error deleting ${modelConfig.info.verbose_name} with ID: ${props.pk}`,
            life: 5000,
        });
        return;
    } else {
        toast.add({
            severity: "success",
            summary: "Delete Success",
            detail: `Deleted ${modelConfig.info.verbose_name} with ID ${props.pk}`,
            life: 5000,
        });
        await router.push(
            getCRUDForTo({
                app: props.app,
                model: props.model,
                view: "list",
            }),
        );
    }
};
</script>

<template>
    <!-- todo: this is a placeholder. this could be a modal from the origin page. -->
    <!--  however, if we keep it as a separate page, that gives us more room to add more features -->
    <!--  like mass delete, etc. -->
    <div v-if="!isEmpty(modelConfig.info)">
        <h1>Delete {{ modelConfig.info.verbose_name }}: {{ pk }}</h1>
        <p>Are you sure you want to delete this {{ modelConfig.info.verbose_name }}?</p>
        <Button @click="handleDelete">Yes, delete</Button>
        <Button @click="router.back()">Cancel</Button>
    </div>
    <div v-else><loading-spinner-block /></div>
</template>
