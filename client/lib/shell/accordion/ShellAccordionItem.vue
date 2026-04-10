<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { AccordionItem, useForwardProps } from "reka-ui";

/**
 * An individual item in an Accordion component.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The unique value of the accordion item. */
    value: { type: String, required: true },
    /** Whether the accordion item is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);
const theme = useTheme("ShellAccordionItem", props);
</script>

<template>
    <AccordionItem
        v-slot="slotProps"
        data-slot="accordion-item"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
    >
        <slot v-bind="slotProps" />
    </AccordionItem>
</template>
