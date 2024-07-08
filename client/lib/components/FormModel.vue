<script setup>
import FormFeedback from "../components/FormFeedback.vue";
import FormHelpText from "../components/FormHelpText.vue";
import FormLabel from "../components/FormLabel.vue";
import FormWrapper from "../components/FormWrapper.vue";
import LoadingSpinnerBlock from "../components/LoadingSpinnerBlock.vue";
import { useCombinedClasses } from "../use/useCombinedClasses.js";
import { useFormModel } from "../use/useFormModel.js";
import { computed, ref } from "vue";

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

const handleSubmit = (form) => {
    emit("submit", form);
};
const handleDirty = (dirty) => {
    emit("dirty", dirty);
};
const formWrapperRef = ref(null);
const formContext = computed(() => {
    return formWrapperRef.value?.form;
});
defineExpose({ form: formContext });
// todo: look into customizability re: overriding field / widget components with arbitrary slot content
// todo: it would be nice to have a way to layout the fields into fieldsets / grids
const combinedClasses = useCombinedClasses("FormModel", props);
</script>

<template>
    <form-wrapper ref="formWrapperRef" @dirty="handleDirty" @submit="handleSubmit">
        <template #default>
            <template v-if="formModel.fields?.length">
                <slot name="beforeFields" />
                <div
                    v-for="fieldObj in formModel.fields.map((x) => formModel.fieldObjects[x])"
                    :key="fieldObj?.name"
                    :class="combinedClasses.fieldsClass"
                >
                    <component :is="formModel.fieldComponents[fieldObj?.name]" v-if="fieldObj" v-bind="fieldObj">
                        <template v-if="!$slots[`field-${fieldObj?.name}`]" #default>
                            <form-label>
                                <template #default>
                                    <component
                                        :is="formModel.widgetComponents[fieldObj.name]"
                                        v-bind="formModel.widgetProps[fieldObj.name]"
                                    />
                                </template>
                            </form-label>
                            <form-help-text />
                            <form-feedback type="error" />
                            <form-feedback type="message" />
                        </template>
                    </component>
                </div>
                <slot name="afterFields" />
            </template>
            <template v-else>
                <loading-spinner-block />
                Loading model information.
            </template>
        </template>
    </form-wrapper>
</template>

<style scoped></style>
