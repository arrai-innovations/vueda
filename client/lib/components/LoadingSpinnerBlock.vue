<script setup>
import ProgressSpinner from "primevue/progressspinner";
import { inject } from "vue";

/**
 * Renders a block-level loading spinner. Uses a PrimeVue ProgressSpinner by
 * default, but accepts a replacement via the `vuedaLoadingSpinnerBlock`
 * injection key so consuming applications can substitute their own component.
 */
defineOptions({});

// Try to inject the provided component, or use the default
const loadingSpinnerComponent = inject("vuedaLoadingSpinnerBlock", null);
</script>

<template>
    <component :is="loadingSpinnerComponent" v-if="loadingSpinnerComponent" />
    <ProgressSpinner v-else aria-label="Loading..." stroke-width="8" />
</template>
