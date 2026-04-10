<script setup>
import { DropdownMenuGroup } from "reka-ui";

/**
 * Groups related dropdown menu items together.
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
    <DropdownMenuGroup data-slot="dropdown-menu-group" v-bind="props">
        <slot />
    </DropdownMenuGroup>
</template>
