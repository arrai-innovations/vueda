<script setup>
import { CollapsibleRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root collapsible component built on Reka UI's CollapsibleRoot.
 */
defineOptions({});

const props = defineProps({
    /** The controlled open state. */
    modelValue: { type: Boolean, default: undefined },
    /** The default open state. */
    defaultOpen: { type: Boolean, default: undefined },
    /** Whether the collapsible is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
const emits = defineEmits(["update:modelValue"]);

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <CollapsibleRoot v-slot="slotProps" data-slot="collapsible" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </CollapsibleRoot>
</template>
