<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import LoadingSpinner from "@vueda/components/LoadingSpinner.vue";
import storeToast from "@vueda/stores/storeToast.js";
import { useCombinedClasses } from "@vueda/use/index.js";
import useModelConfig from "@vueda/use/useModelConfig";
import isEmpty from "lodash-es/isEmpty";
import { reactive, ref, toRef } from "vue";
import { useRouter } from "vue-router";

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
        type: String,
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

const router = useRouter();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    id: toRef(props, "pk"),
    listArgs: {},
    intendToRetrieve: false,
});
const instanceObject = useObject(instanceObjectProps);

const confirmDelete = ref(false);

const toastStore = storeToast();

const handleDelete = async () => {
    await instanceObject.delete();
    toastStore.addToast({
        title: "Delete Success",
        message: `Deleted ${modelConfig.info.verbose_name} with ID ${props.pk}`,
        variant: "success",
        autoDismiss: 5000,
    });
    router.back();
};

const combinedClasses = useCombinedClasses("@vueda/views/ViewDelete.vue", props);
</script>

<template>
    <!-- todo: this is a placeholder. this could be a modal from the origin page. -->
    <!--  however, if we keep it as a separate page, that gives us more room to add more features -->
    <!--  like mass delete, etc. -->
    <div v-if="!isEmpty(modelConfig.info)" :class="combinedClasses.outerClass">
        <h1>Delete {{ modelConfig.info.verbose_name }}: {{ pk }}</h1>
        <p>Are you sure you want to delete this {{ modelConfig.info.verbose_name }}?</p>
        <div v-if="!confirmDelete">
            <button @click="confirmDelete = true">Yes, delete</button>
            <button @click="router.back()">Cancel</button>
        </div>
        <div v-else>
            <p>This action cannot be undone. Are you absolutely sure?</p>
            <button @click="handleDelete">Yes, delete permanently</button>
            <button @click="router.back()">Cancel</button>
        </div>
    </div>
    <div v-else><loading-spinner /></div>
</template>
