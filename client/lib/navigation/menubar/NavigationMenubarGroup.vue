<script setup>
import { MenubarGroup } from "reka-ui";

/**
 * Groups related menubar items together.
 */
defineOptions({});

const props = defineProps({
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
</script>

<template>
    <MenubarGroup data-slot="menubar-group" v-bind="props">
        <slot />
    </MenubarGroup>
</template>
