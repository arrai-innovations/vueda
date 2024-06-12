<script setup>
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import FormLabel from "@vueda/components/FormLabel.vue";
import FormWrapper from "@vueda/components/FormWrapper.vue";
import LoadingSpinner from "@vueda/components/LoadingSpinner.vue";
import { useCombinedClasses } from "@vueda/use/index.js";
import useFormModel from "@vueda/use/useFormModel.js";
import { reactive } from "vue";

const props = defineProps({
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    fields: {
        type: Array,
        default: () => [],
    },
    initialData: {
        type: Object,
        default: () => ({}),
    },
    variant: {
        type: String,
        default: "default",
    },
    fieldsClass: {
        type: [String, Array, Object],
        default: () => [],
    },
});
const emit = defineEmits(["submit", "dirty"]);

const formModel = useFormModel(props);
const myState = reactive({
    form: null,
    formErrors: null,
});

const handleSubmit = (form) => {
    emit("submit", form);
};
const handleDirty = (dirty) => {
    emit("dirty", dirty);
};
// todo: look into customizability re: overriding field / widget components with arbitrary slot content
// todo: it would be nice to have a way to layout the fields into fieldsets / grids
const combinedClasses = useCombinedClasses("@vueda/components/FormModel.vue", props);
</script>

<template>
    <form-wrapper
        v-if="Object.keys(formModel.modelInfo || {})?.length"
        :form="myState.form"
        :form-errors="myState.formErrors"
        @dirty="handleDirty"
        @submit="handleSubmit"
    >
        <template #default>
            <slot name="beforeFields" />
            <div
                v-for="fieldObj in formModel.fields.map((x) => formModel.fieldObjects[x])"
                :key="fieldObj.name"
                :class="combinedClasses.fieldsClass"
            >
                <component :is="formModel.fieldComponents[fieldObj.name]" v-bind="fieldObj">
                    <template v-if="!$slots[`field-${fieldObj.name}`]" #default>
                        <form-label />
                        <component :is="formModel.widgetComponents[fieldObj.name]" />
                        <form-help-text />
                        <form-feedback type="error" />
                        <form-feedback type="message" />
                    </template>
                </component>
            </div>
            <slot name="afterFields" />
        </template>
    </form-wrapper>
    <template v-else>
        <loading-spinner />
        Loading model information.
    </template>
</template>

<style scoped></style>
