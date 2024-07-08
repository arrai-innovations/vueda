<script setup>
import FormModel from "../components/FormModel.vue";
import LoadingSpinnerInline from "../components/LoadingSpinnerInline.vue";
import { storeModelConfig } from "../stores/storeModelConfig.js";
import { useCombinedClasses } from "../use/useCombinedClasses.js";
import { useIsActive } from "../use/useIsActive.js";
import { useLeaveUnload } from "../use/useLeaveUnload.js";
import { useModelConfig } from "../use/useModelConfig.js";
import { FormValidationError } from "../utils/errors.js";
import { useObject } from "@arrai-innovations/reactive-helpers";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import { computed, reactive, ref, toRef } from "vue";

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
    updateFields: {
        type: Array,
        default: undefined,
    },
    initialData: {
        type: Object,
        default: () => ({}),
    },
    variant: {
        type: String,
        default: "default",
    },
    outerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    headerClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    titleClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    bodyClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    loadingClass: {
        type: [String, Array, Object],
        default: () => [],
    },
    formModelVariant: {
        type: String,
        default: "default",
    },
    // other form-model props will get passed in via $attrs, as long as there are no conflicts
});
const formModelRef = ref(null);

const isActive = useIsActive();
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"));
const calculatedUpdateFields = computed(() => {
    // if they don't pass updateFields, use the modelConfig fields.
    //  modelConfig fields already falls back to models fields supplied by the server
    return (
        props.updateFields || modelConfig.config.updateFields || modelConfig.info.model_fields?.map((f) => f.name) || []
    );
});

const modelConfigStore = storeModelConfig();
const validAndActive = computed(() => !!(isActive.value && props.app && props.model && props.pk));
const instanceObjectProps = reactive({
    crudArgs: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    id: toRef(props, "pk"),
    retrieveArgs: {
        f: calculatedUpdateFields,
    },
    intendToRetrieve: validAndActive,
});
const instanceObject = useObject({
    props: instanceObjectProps,
});

const myState = reactive({
    submitting: false,
    dirty: false,
});

const toast = useToast();
const handleSubmit = async (formContext) => {
    myState.submitting = true;
    try {
        await instanceObject.update({ object: formContext.values });
        if (instanceObject.state.errored) {
            if (instanceObject.state.error instanceof FormValidationError) {
                const error = instanceObject.state.error;
                formModelRef.value?.form.handleServerFormValidationError(error);
            } else {
                toast.add({
                    severity: "error",
                    summary: "Update Failed",
                    detail: `An error occurred while updating ${modelConfig.info.verbose_name}`,
                    life: 5000,
                });
            }
        } else {
            toast.add({
                severity: "success",
                summary: "Update Success",
                detail: `${modelConfig.info.verbose_name} saved`,
                life: 5000,
            });
        }
    } finally {
        myState.submitting = false;
    }
};
const handleDirty = (dirty) => {
    myState.dirty = dirty;
};
useLeaveUnload(myState);
const combinedClasses = useCombinedClasses("ViewUpdate", props);
const doSubmit = () => {
    formModelRef.value?.form.doSubmit();
};
</script>

<template>
    <div :class="combinedClasses.outerClass">
        <div :class="combinedClasses.headerClass">
            <h1 :class="combinedClasses.titleClass">
                {{ `Update ${modelConfigStore.info?.verbose_name}` || "Update Item" }}
                <loading-spinner-inline v-if="modelConfigStore.loading" :class="combinedClasses.loadingClass" />
                <Button class="w-full" label="Save" :loading="modelConfig.loading" type="submit" @click="doSubmit" />
            </h1>
        </div>
        <div :class="combinedClasses.bodyClass">
            <form-model
                ref="formModelRef"
                :app="app"
                :fields="calculatedUpdateFields"
                :initial-values="instanceObject.state.object"
                :model="model"
                :variant="formModelVariant"
                v-bind="$attrs"
                @dirty="handleDirty"
                @submit="handleSubmit"
            >
            </form-model>
        </div>
    </div>
</template>

<style scoped></style>
