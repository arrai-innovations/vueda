<script setup>
import PageTitle from "@vueda/shell/page-title/PageTitle.vue";
import { usePageTitle } from "@vueda/use/usePageTitle.js";

/**
 * Docs-only stand-in for the layout an integrator wraps around `<RouterView>`.
 *
 * Views contribute their title through `usePageTitle(source)` and teleport page-level
 * buttons through `PageActions`. Both need a context established ABOVE the title display
 * and the view, which is the layout's job (see `usePageTitle`). Without one, a view
 * degrades gracefully but misleadingly: the title vanishes and the page actions render
 * inline at the top of the view body instead of in the title row.
 *
 * Calling `usePageTitle()` with no argument here establishes and provides that context,
 * so the `PageTitle` below and the slotted view share it.
 */
usePageTitle();
</script>

<template>
    <div class="flex flex-col">
        <PageTitle />
        <slot />
    </div>
</template>
