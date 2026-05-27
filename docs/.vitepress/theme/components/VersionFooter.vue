<script setup>
import { useData } from "vitepress";
import { computed } from "vue";

const { theme } = useData();

const parts = computed(() => {
    const versions = theme.value.vueda || {};
    const out = [];
    if (versions.server) {
        out.push({ label: "server", version: versions.server });
    }
    if (versions.client) {
        out.push({ label: "client", version: versions.client });
    }
    return out;
});
</script>

<template>
    <footer v-if="parts.length" class="VuedaVersionFooter">
        <p class="line">
            <span>Documents matching: </span>
            <template v-for="(part, index) in parts" :key="part.label">
                <span v-if="index > 0" class="sep" aria-hidden="true">·</span>
                <span
                    >{{ part.label }} <code>v{{ part.version }}</code></span
                >
            </template>
        </p>
    </footer>
</template>

<style scoped>
.VuedaVersionFooter {
    border-top: 1px solid var(--vp-c-gutter);
    padding: 16px 24px;
    background-color: var(--vp-c-bg);
    text-align: center;
}

.line {
    margin: 0;
    font-size: 13px;
    line-height: 20px;
    color: var(--vp-c-text-2);
}

.line .sep {
    margin: 0 0.5em;
    color: var(--vp-c-text-3);
}

.line code {
    font-size: 12px;
}
</style>
