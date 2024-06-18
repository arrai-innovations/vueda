<script setup>
import ProgressSpinner from "primevue/progressspinner";
import { inject } from "vue";

// Try to inject the provided component, or use the default
const loadingSpinnerComponent = inject("vuedaLoadingSpinnerInline", null);
</script>

<template>
    <component :is="loadingSpinnerComponent" v-if="loadingSpinnerComponent" />
    <ProgressSpinner
        v-else
        :pt="{
            root: {
                class: ['w-4', 'h-4', 'inline-block', 'relative', 'mx-1'],
            },
        }"
    />
</template>
