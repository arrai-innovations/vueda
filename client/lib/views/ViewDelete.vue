<script setup>
import { useObject } from "@arrai-innovations/reactive-helpers";
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";
import { useCombinedClasses } from "@vueda/use/useCombinedClasses.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useModelConfig } from "@vueda/use/useModelConfig";
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

const isActive = useIsActive();
const validAndActive = computed(() => !!(isActive.value && props.app && props.model && props.pk));
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));

const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    id: toRef(props, "pk"),
    retrieveArgs: {
        f: {},
    },
    intendToRetrieve: validAndActive,
});
const instanceObject = useObject({
    props: instanceObjectProps,
});

const toast = useToast();
const router = useRouter();

const handleDelete = async () => {
    await instanceObject.delete();
    if (instanceObject.state.errored) {
        console.log("instanceObject.state.error");
        toast.add({
            severity: "error",
            summary: "Delete Error",
            detail: `Error deleting ${modelConfig.info.verbose_name} with ID ${props.pk}`,
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
        router.back();
    }
};

const combinedClasses = useCombinedClasses("ViewDelete", props);
</script>

<template>
    <!-- todo: this is a placeholder. this could be a modal from the origin page. -->
    <!--  however, if we keep it as a separate page, that gives us more room to add more features -->
    <!--  like mass delete, etc. -->
    <div v-if="!isEmpty(modelConfig.info)" :class="combinedClasses.outerClass">
        <h1>Delete {{ modelConfig.info.verbose_name }}: {{ pk }}</h1>
        <p>Are you sure you want to delete this {{ modelConfig.info.verbose_name }}?</p>
        <Button @click="handleDelete">Yes, delete</Button>
        <Button @click="router.back()">Cancel</Button>
    </div>
    <div v-else><loading-spinner-block /></div>
</template>
