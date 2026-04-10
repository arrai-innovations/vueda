<script setup>
import { AccordionRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root accordion component built on Reka UI's AccordionRoot.
 */
defineOptions({});

const props = defineProps({
    /** The type of accordion (single or multiple). */
    type: { type: String, default: undefined },
    /** The default expanded item(s). */
    defaultValue: { type: [String, Array], default: undefined },
    /** The controlled expanded item(s). */
    modelValue: { type: [String, Array], default: undefined },
    /** Whether the accordion is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** Whether collapsing is allowed. */
    collapsible: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
const emits = defineEmits(["update:modelValue"]);

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
    <AccordionRoot v-slot="slotProps" data-slot="accordion" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </AccordionRoot>
</template>
