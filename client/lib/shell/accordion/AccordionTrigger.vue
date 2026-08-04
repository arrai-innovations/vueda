<script setup>
import "@vueda/theme/vueda-tailwind/shell/AccordionTrigger.theme.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { AccordionHeader, AccordionTrigger } from "reka-ui";

/**
 * The trigger button for an AccordionItem, wrapped in an AccordionHeader.
 */
defineOptions({});

const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether the trigger is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "iconOverride", "class", "themeOverride");
const theme = useTheme("AccordionTrigger", props);
const icon = useIcons("AccordionTrigger", props);
</script>

<template>
    <AccordionHeader :class="theme('header')" :style="theme.hideStyle?.value">
        <AccordionTrigger data-slot="accordion-trigger" v-bind="delegatedProps" :class="[theme('root'), props.class]">
            <slot />
            <span :class="theme('icon')">
                <component
                    :is="icon('caretDown').component"
                    v-if="icon('caretDown')"
                    v-bind="icon('caretDown').props"
                    aria-hidden="true"
                />
            </span>
        </AccordionTrigger>
    </AccordionHeader>
</template>
