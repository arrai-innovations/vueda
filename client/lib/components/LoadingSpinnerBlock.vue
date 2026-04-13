<script setup>
import Spinner from "@vueda/feedback/spinner/Spinner.vue";
import { inject } from "vue";

/**
 * Renders a block-level loading spinner. Uses a Spinner by
 * default, but accepts a replacement via the `vuedaLoadingSpinnerBlock`
 * injection key so consuming applications can substitute their own component.
 */
defineOptions({});

// Try to inject the provided component, or use the default
const loadingSpinnerComponent = inject("vuedaLoadingSpinnerBlock", null);
</script>

<template>
    <component :is="loadingSpinnerComponent" v-if="loadingSpinnerComponent" />
    <Spinner v-else />
</template>
