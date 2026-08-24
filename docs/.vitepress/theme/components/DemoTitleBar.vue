<script setup>
import PageActions from "@vueda/shell/page-title/PageActions.vue";
import PageTitle from "@vueda/shell/page-title/PageTitle.vue";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { defineComponent } from "vue";

/**
 * Docs-only stand-in for the layout that owns a page title.
 *
 * `PageTitle` reads its title and loading state from `usePageTitle` rather than
 * from props, because in a real application the layout mounts it once above
 * `<RouterView>` and each routed view registers its own title into that context.
 * A documentation page has no router and needs several independent title bars on
 * one page, so this wrapper collapses both halves of that contract into one
 * component: it establishes an isolated page-title context, registers a title
 * into it, and renders the real `PageTitle` display plus an optional
 * `PageActions` cluster.
 *
 * Wrap usages in `<ClientOnly>`: `PageActions` teleports into the title bar's
 * action zone, which only exists once the display has mounted.
 */
defineProps({
    /** Title registered into this bar's own page-title context. */
    title: { type: String, default: undefined },
    /** Registers the view as loading, which renders the inline spinner after the title. */
    loading: { type: Boolean, default: undefined },
    /** Forwarded to `PageTitle`; pins the bar to the top of the scroll viewport. */
    sticky: { type: Boolean, default: false },
});

// Registers a title source into the surrounding context and renders nothing. This is
// the half a real view owns, via usePageTitle(() => ({ title, loading })).
const TitleRegistrar = defineComponent({
    name: "TitleRegistrar",
    props: { title: { type: String, default: undefined }, loading: { type: Boolean, default: undefined } },
    setup(props) {
        usePageTitle(() => ({ title: props.title, loading: props.loading }));
        return () => null;
    },
});

// Establishes the context the registrar above writes into and PageTitle reads from.
usePageTitle();
</script>

<template>
    <TitleRegistrar :loading="loading" :title="title" />
    <PageTitle :sticky="sticky" />
    <PageActions v-if="$slots.actions">
        <slot name="actions" />
    </PageActions>
</template>
