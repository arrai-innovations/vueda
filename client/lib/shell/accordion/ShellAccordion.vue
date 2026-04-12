<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { AccordionRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root accordion component built on Reka UI's AccordionRoot.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
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
const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ShellAccordion", props);
</script>

<template>
    <AccordionRoot v-slot="slotProps" data-slot="accordion" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot v-bind="slotProps" />
    </AccordionRoot>
</template>
