<script setup>
import { withBase } from "vitepress";

defineProps({
    term: {
        type: String,
        required: true,
    },
    href: {
        type: String,
        required: true,
    },
});
</script>

<template>
    <a :href="withBase(href)" class="glossary-term" :aria-label="`Glossary term: ${term}`">
        <slot>{{ term }}</slot>
    </a>
</template>

<style scoped>
.glossary-term {
    text-decoration-line: underline;
    text-decoration-style: dotted;
    text-underline-offset: 0.15em;
}
</style>
