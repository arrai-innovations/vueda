<script setup>
defineProps({
    help: {
        type: String,
        default: '',
    },
});
</script>
<template>
    <div>
        <slot :help="help">{{ help }}</slot>
    </div>
</template>
