<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { AccordionHeader, AccordionTrigger } from "reka-ui";

/**
 * The trigger button for an AccordionItem, wrapped in an AccordionHeader.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether the trigger is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("ShellAccordionTrigger", props);
</script>

<template>
    <AccordionHeader :class="theme('header')">
        <AccordionTrigger data-slot="accordion-trigger" v-bind="delegatedProps" :class="[theme('root'), props.class]">
            <slot />
            <slot name="icon">
                <span :class="theme('icon')">▼</span>
            </slot>
        </AccordionTrigger>
    </AccordionHeader>
</template>
