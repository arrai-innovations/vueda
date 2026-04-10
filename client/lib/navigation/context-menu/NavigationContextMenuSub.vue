<script setup>
import { ContextMenuSub, useForwardPropsEmits } from "reka-ui";

/**
 * The root provider for a context submenu.
 */
defineOptions({});

const props = defineProps({
    /** The controlled open state of the submenu. */
    open: { type: Boolean, default: undefined },
    /** The open state of the submenu when initially rendered. */
    defaultOpen: { type: Boolean, default: undefined },
});

const emits = defineEmits(["update:open"]);

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <ContextMenuSub data-slot="context-menu-sub" v-bind="forwarded">
        <slot />
    </ContextMenuSub>
</template>
