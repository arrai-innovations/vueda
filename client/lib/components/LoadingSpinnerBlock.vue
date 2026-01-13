<script setup>
import ProgressSpinner from "primevue/progressspinner";
import { inject } from "vue";

// Try to inject the provided component, or use the default
const loadingSpinnerComponent = inject("vuedaLoadingSpinnerBlock", null);
</script>

<template>
    <component :is="loadingSpinnerComponent" v-if="loadingSpinnerComponent" />
    <ProgressSpinner v-else aria-label="Loading..." stroke-width="8" />
</template>
