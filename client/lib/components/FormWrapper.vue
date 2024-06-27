<script setup>
import useForm from "@vueda/use/useForm.js";
import { toRef, watch } from "vue";

const props = defineProps({
    id: {
        type: String,
        required: true,
    },
    initialValues: {
        type: Object,
        default: () => ({}),
    },
});
const emit = defineEmits(["submit", "dirty"]);
const form = useForm(props);
const handleSubmit = () => {
    emit("submit", form);
};
watch(toRef(form, "anyDirty"), (dirty) => {
    emit("dirty", dirty);
});
const doSubmit = () => {
    handleSubmit();
};

form.updateDoSubmit(doSubmit);
defineExpose({ form });
</script>

<template>
    <form :id="id" data-qa="FormWrapper" novalidate @submit.prevent="handleSubmit">
        <slot v-bind="form"></slot>
    </form>
</template>
