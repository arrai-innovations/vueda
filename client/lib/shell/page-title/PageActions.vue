<script setup>
import { PageTitleContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * Wraps page-level action buttons and renders them into the page-title action zone bound by a
 * display component (see `usePageTitle`). When no zone exists, the actions render inline where this
 * component is placed, so a view degrades gracefully if the layout omits a title display.
 */
defineOptions({
    inheritAttrs: false, // the root is a Teleport, which has no host element to receive attributes
});

const context = inject(PageTitleContextSymbol, null);
const target = computed(() => context?.actionTarget?.value ?? null);
</script>
<template>
    <!-- disabled (not v-if) so the slotted buttons keep their state as the zone appears or disappears -->
    <Teleport :to="target" :disabled="!target">
        <slot />
    </Teleport>
</template>
