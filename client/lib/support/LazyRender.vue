<script setup>
import { useIntersectionObserver } from "@vueuse/core";
import { ref } from "vue";

/**
 * Defers rendering its default slot until the component scrolls into the viewport,
 * using an IntersectionObserver. Before the content is visible, a placeholder slot
 * is rendered instead, allowing callers to supply a skeleton or spacer.
 */
defineOptions({});

const target = ref(null);
const isVisible = ref(false);

useIntersectionObserver(
    target,
    ([entry]) => {
        if (entry.isIntersecting) {
            isVisible.value = true;
        }
    },
    { once: true },
);
</script>

<template>
    <template v-if="isVisible">
        <slot />
    </template>
    <template v-else>
        <div ref="target" style="height: 1px; width: 100%; visibility: hidden" />
        <slot name="placeholder" />
    </template>
</template>
