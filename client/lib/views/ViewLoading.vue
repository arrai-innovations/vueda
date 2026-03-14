<script setup>
import LoadingSpinnerBlock from "@vueda/components/LoadingSpinnerBlock.vue";

/**
 * Full-page loading placeholder that displays a centered spinner. Use it as a route-level fallback while
 * async data or components are being resolved.
 */
defineOptions({});
</script>

<template>
    <div>
        <div class="flex w-full h-full items-center justify-center"><loading-spinner-block class="w-1/3 h-1/3" /></div>
    </div>
</template>
