<script setup>
import { useData } from "vitepress";
import { computed } from "vue";

const { frontmatter } = useData();
const markdownUrl = computed(
    () =>
        frontmatter.value.head?.find(
            ([tag, attributes]) =>
                tag === "link" && attributes.rel === "alternate" && attributes.type === "text/markdown",
        )?.[1].href,
);
</script>

<template>
    <p
        v-if="markdownUrl"
        class="PageMarkdownLink"
        :class="{ standalone: frontmatter.layout === 'home' || frontmatter.layout === 'page' }"
    >
        <a :href="markdownUrl" target="_self">View Markdown</a>
    </p>
</template>

<style scoped>
.PageMarkdownLink {
    margin: 0 0 16px;
    text-align: right;
    font-size: 13px;
    line-height: 24px;
}

.PageMarkdownLink.standalone {
    width: 100%;
    max-width: 1200px;
    margin: 24px auto;
    padding: 0 24px;
}

a {
    color: var(--vp-c-brand-1);
    text-decoration: underline;
    text-underline-offset: 3px;
}

a:hover {
    color: var(--vp-c-brand-2);
}
</style>
