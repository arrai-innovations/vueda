<script setup>
import { HoverCardRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root hover card component built on Reka UI's HoverCardRoot.
 */
defineOptions({});

const props = defineProps({
    /** The controlled open state. */
    modelValue: { type: Boolean, default: undefined },
    /** The default open state. */
    defaultOpen: { type: Boolean, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** Delay in milliseconds before the hover card opens. */
    openDelay: { type: Number, default: undefined },
    /** Delay in milliseconds before the hover card closes. */
    closeDelay: { type: Number, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <HoverCardRoot v-slot="slotProps" data-slot="hover-card" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </HoverCardRoot>
</template>
