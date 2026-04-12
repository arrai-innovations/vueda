<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { TooltipArrow, TooltipContent, TooltipPortal, useForwardPropsEmits } from "reka-ui";

/**
 * The content panel of a Tooltip, rendered in a portal with an arrow.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The distance in pixels from the trigger. */
    sideOffset: { type: Number, default: 4 },
    /** The side of the trigger to show the tooltip on. */
    side: { type: String, default: undefined },
    /** The alignment of the tooltip relative to the trigger. */
    align: { type: String, default: undefined },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
    /** Whether to show the arrow. */
    ariaLabel: { type: String, default: undefined },
});

const emits = defineEmits({
    /** Emitted when the Escape key is pressed. */
    escapeKeyDown: null,
    /** Emitted when a pointer-down event occurs outside the content. */
    pointerDownOutside: null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ShellTooltipContent", props);
</script>

<template>
    <TooltipPortal>
        <TooltipContent
            data-slot="tooltip-content"
            v-bind="{ ...forwarded, ...$attrs }"
            :class="[theme('root'), props.class]"
        >
            <slot />

            <TooltipArrow :class="theme('arrow')" />
        </TooltipContent>
    </TooltipPortal>
</template>
