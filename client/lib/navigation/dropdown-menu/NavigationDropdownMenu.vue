<script setup>
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { DropdownMenuRoot } from "reka-ui";

/**
 * The root provider for a dropdown menu.
 */
defineOptions({});

const props = defineProps({
    /** The controlled open state of the menu. */
    open: { type: Boolean, default: undefined },
    /** The open state of the dropdown menu when initially rendered. */
    defaultOpen: { type: Boolean, default: undefined },
    /**
     * The reading direction of the menu.
     */
    dir: { type: String, default: undefined },
    /** When true, interaction with outside elements will be disabled. */
    modal: { type: Boolean, default: undefined },
});

const emits = defineEmits({
    /** Emitted when the open state changes. */
    "update:open": null,
});

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <DropdownMenuRoot v-slot="slotProps" data-slot="dropdown-menu" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </DropdownMenuRoot>
</template>
