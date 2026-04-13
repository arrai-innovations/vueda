<script setup>
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { MenubarSub } from "reka-ui";

/**
 * The root provider for a menubar submenu.
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
    <MenubarSub v-slot="slotProps" data-slot="menubar-sub" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </MenubarSub>
</template>
