<script setup>
import NavigationSidebarMenuButtonChild from "./NavigationSidebarMenuButtonChild.vue";
import { ShellTooltip, ShellTooltipContent, ShellTooltipTrigger } from "@vueda/shell/tooltip";
import { useSidebar } from "@vueda/use/useSidebar.js";
import { reactiveOmit } from "@vueuse/core";

/**
 * A sidebar menu button that shows a tooltip when the sidebar is collapsed.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: "button" },
    /** When true, merges props onto the child element. */
    asChild: { type: Boolean, default: false },
    /** The style variant. */
    variant: { type: String, default: "default" },
    /** The size variant. */
    size: { type: String, default: "default" },
    /** Whether the button represents the current active item. */
    isActive: { type: Boolean, default: false },
    /** Tooltip content shown when sidebar is collapsed. Pass a string or component. */
    tooltip: { type: [String, Object], default: undefined },
});

const { isMobile, state } = useSidebar();

const delegatedProps = reactiveOmit(props, "tooltip");
</script>

<template>
    <NavigationSidebarMenuButtonChild v-if="!tooltip" v-bind="{ ...delegatedProps, ...$attrs }">
        <slot />
    </NavigationSidebarMenuButtonChild>

    <ShellTooltip v-else>
        <ShellTooltipTrigger as-child>
            <NavigationSidebarMenuButtonChild v-bind="{ ...delegatedProps, ...$attrs }">
                <slot />
            </NavigationSidebarMenuButtonChild>
        </ShellTooltipTrigger>
        <ShellTooltipContent side="right" align="center" :hidden="state !== 'collapsed' || isMobile">
            <template v-if="typeof tooltip === 'string'">
                {{ tooltip }}
            </template>
            <component :is="tooltip" v-else />
        </ShellTooltipContent>
    </ShellTooltip>
</template>
