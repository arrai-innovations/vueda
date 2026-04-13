<script setup>
import SidebarMenuButtonChild from "./SidebarMenuButtonChild.vue";
import Tooltip from "@vueda/shell/tooltip/Tooltip.vue";
import TooltipContent from "@vueda/shell/tooltip/TooltipContent.vue";
import TooltipTrigger from "@vueda/shell/tooltip/TooltipTrigger.vue";
import { useSidebar } from "@vueda/use/useSidebar.js";
import { reactiveOmit } from "@vueuse/core";

/**
 * A sidebar menu button that shows a tooltip when the sidebar is collapsed.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
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
    <SidebarMenuButtonChild v-if="!tooltip" v-bind="{ ...delegatedProps, ...$attrs }">
        <slot />
    </SidebarMenuButtonChild>

    <Tooltip v-else>
        <TooltipTrigger as-child>
            <SidebarMenuButtonChild v-bind="{ ...delegatedProps, ...$attrs }">
                <slot />
            </SidebarMenuButtonChild>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" :hidden="state !== 'collapsed' || isMobile">
            <template v-if="typeof tooltip === 'string'">
                {{ tooltip }}
            </template>
            <component :is="tooltip" v-else />
        </TooltipContent>
    </Tooltip>
</template>
