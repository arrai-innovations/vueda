<script setup>
import FeedbackSpinner from "@vueda/feedback/spinner/FeedbackSpinner.vue";
import { inject } from "vue";

/**
 * Renders an inline loading spinner. Uses a FeedbackSpinner by
 * default, but accepts a replacement via the `vuedaLoadingSpinnerInline`
 * injection key so consuming applications can substitute their own component.
 */
defineOptions({});

// Try to inject the provided component, or use the default
const loadingSpinnerComponent = inject("vuedaLoadingSpinnerInline", null);
</script>

<template>
    <component :is="loadingSpinnerComponent" v-if="loadingSpinnerComponent" />
    <FeedbackSpinner v-else />
</template>
