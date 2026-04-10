<script setup>
import { ContextMenuRoot, useForwardPropsEmits } from "reka-ui";

/**
 * The root provider for a context menu.
 */
defineOptions({});

const props = defineProps({
    /**
     * The reading direction of the menu.
     */
    dir: { type: String, default: undefined },
    /** When true, interaction with outside elements will be disabled. */
    modal: { type: Boolean, default: undefined },
    /** The duration in ms from when the trigger is pressed until the menu opens. */
    pressOpenDelay: { type: Number, default: undefined },
});

const emits = defineEmits(["update:open"]);

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <ContextMenuRoot data-slot="context-menu" v-bind="forwarded">
        <slot />
    </ContextMenuRoot>
</template>
