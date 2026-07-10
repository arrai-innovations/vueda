<script setup>
/**
 * A renderless wrapper that passes all attributes and slots through without adding any
 * DOM element. Useful as a no-op root when a component needs to conditionally omit its
 * wrapping element.
 */
</script>

<template>
    <slot v-bind="$attrs" />
</template>
