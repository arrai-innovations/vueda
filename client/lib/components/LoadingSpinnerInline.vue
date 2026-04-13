<script setup>
import Spinner from "@vueda/feedback/spinner/Spinner.vue";
import { inject } from "vue";

/**
 * Renders an inline loading spinner. Uses a Spinner by
 * default, but accepts a replacement via the `vuedaLoadingSpinnerInline`
 * injection key so consuming applications can substitute their own component.
 */
defineOptions({});

// Try to inject the provided component, or use the default
const loadingSpinnerComponent = inject("vuedaLoadingSpinnerInline", null);
</script>

<template>
    <component :is="loadingSpinnerComponent" v-if="loadingSpinnerComponent" />
    <Spinner v-else />
</template>
