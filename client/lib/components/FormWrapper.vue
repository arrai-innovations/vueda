<script setup>
import useForm from "@vueda/use/useForm.js";

const props = defineProps({
    initialValues: {
        type: Object,
        default: () => ({}),
    },
});
const emit = defineEmits(["submit"]);
const form = useForm(props);
const handleSubmit = () => {
    emit("submit", form);
};
const doSubmit = () => {
    handleSubmit();
};
form.updateDoSubmit(doSubmit);
defineExpose({ form });
</script>

<template>
    <form data-qa="FormWrapper" novalidate @submit.prevent="handleSubmit">
        <slot v-bind="form"></slot>
    </form>
</template>
