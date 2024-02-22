<script setup>
import useForm from "@vueda/use/useForm.js";

const props = defineProps({
    initialValues: Object,
});
const emit = defineEmits(["submit"]);
const form = useForm(props);
const handleSubmit = () => {
    emit("submit", form);
};
defineExpose({ form });
</script>

<template>
    <form data-qa="FormWrapper" novalidate @submit.prevent="handleSubmit">
        <slot v-bind="form"></slot>
    </form>
</template>
