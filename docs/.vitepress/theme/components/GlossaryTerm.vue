<script setup lang="ts">
defineProps<{
    term: string;
    href: string;
}>();
</script>

<template>
    <a :href="href" class="glossary-term" :aria-label="`Glossary term: ${term}`">
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
