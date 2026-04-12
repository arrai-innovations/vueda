<script setup>
import { DropdownMenuSub, useForwardPropsEmits } from "reka-ui";

/**
 * The root provider for a dropdown submenu.
 */
defineOptions({});

const props = defineProps({
    /** The controlled open state of the submenu. */
    open: { type: Boolean, default: undefined },
    /** The open state of the submenu when initially rendered. */
    defaultOpen: { type: Boolean, default: undefined },
});

const emits = defineEmits({
    /** Emitted when the open state changes. */
    "update:open": null,
});

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <DropdownMenuSub v-slot="slotProps" data-slot="dropdown-menu-sub" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </DropdownMenuSub>
</template>
