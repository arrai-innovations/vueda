<script setup>
defineProps({
    for: {
        type: String,
        required: true,
    },
    label: {
        type: String,
        default: null,
    },
});
</script>
<template>
    <label :for="name">
        <slot :for="$props.for" :label="label">{{ label }}</slot>
    </label>
</template>
