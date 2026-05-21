<script setup>
import { useData, withBase } from "vitepress";
import { useSidebar } from "vitepress/theme";
import { computed } from "vue";

const { page, theme } = useData();
const { hasSidebar } = useSidebar();

const crumbs = computed(() => {
    const relativePath = page.value?.relativePath;
    if (!relativePath || relativePath === "index.md") {
        return [];
    }

    let route;
    if (relativePath.endsWith("/index.md")) {
        route = `/${relativePath.slice(0, -"index.md".length)}`;
    } else {
        route = `/${relativePath.replace(/\.md$/, "")}`;
    }
    if (route !== "/" && route.endsWith("/")) {
        route = route.slice(0, -1);
    }
    if (route === "/") {
        return [];
    }

    const segments = route.slice(1).split("/");
    const titles = theme.value?.routeTitles || {};
    const result = [];
    let acc = "";
    for (let i = 0; i < segments.length; i += 1) {
        acc += `/${segments[i]}`;
        const text = titles[acc] || segments[i];
        const isLast = i === segments.length - 1;
        result.push({ text, href: isLast ? null : acc });
    }
    return result;
});

const visible = computed(() => crumbs.value.length > 1);
</script>

<template>
    <nav v-if="visible" class="vueda-breadcrumbs" :class="{ 'has-sidebar': hasSidebar }" aria-label="Breadcrumb">
        <ol>
            <li v-for="(crumb, i) in crumbs" :key="i">
                <a v-if="crumb.href" :href="withBase(crumb.href)">{{ crumb.text }}</a>
                <span v-else aria-current="page">{{ crumb.text }}</span>
            </li>
        </ol>
    </nav>
</template>

<style scoped>
.vueda-breadcrumbs {
    width: 100%;
    background-color: var(--vp-local-nav-bg-color);
    border-bottom: 1px solid var(--vp-c-gutter);
    font-size: 0.8rem;
    color: var(--vp-c-text-2);
    padding: 0.5rem 24px;
}

@media (min-width: 768px) {
    .vueda-breadcrumbs {
        padding: 0.5rem 32px;
    }
}

@media (min-width: 960px) {
    .vueda-breadcrumbs {
        position: fixed;
        top: var(--vp-nav-height);
        left: 0;
        right: 0;
        z-index: var(--vp-z-index-local-nav);
        padding: 0.5rem 32px;
    }

    .vueda-breadcrumbs.has-sidebar {
        padding-left: calc(var(--vp-sidebar-width) + 32px);
    }
}

@media (min-width: 1440px) {
    .vueda-breadcrumbs.has-sidebar {
        padding-left: calc((100vw - var(--vp-layout-max-width)) / 2 + var(--vp-sidebar-width) + 32px);
        padding-right: calc((100vw - var(--vp-layout-max-width)) / 2 + 32px);
    }
}

.vueda-breadcrumbs ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.5rem;
    list-style: none;
    margin: 0;
    padding: 0;
}

.vueda-breadcrumbs li {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
}

.vueda-breadcrumbs li + li::before {
    content: "/";
    color: var(--vp-c-divider);
}

.vueda-breadcrumbs a {
    color: var(--vp-c-text-2);
    text-decoration: none;
    transition: color 0.2s;
}

.vueda-breadcrumbs a:hover {
    color: var(--vp-c-brand-1);
}

.vueda-breadcrumbs [aria-current="page"] {
    color: var(--vp-c-text-1);
    font-weight: 500;
}
</style>
