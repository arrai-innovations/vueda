<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { PopoverContent, PopoverPortal, useForwardPropsEmits } from "reka-ui";

/**
 * The content panel of a Popover, rendered in a portal with positioning support.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The alignment of the popover relative to the trigger. */
    align: { type: String, default: "center" },
    /** The distance in pixels from the trigger. */
    sideOffset: { type: Number, default: 4 },
    /** The side of the trigger to show the popover on. */
    side: { type: String, default: undefined },
    /** Whether to force mount the content. */
    forceMount: { type: Boolean, default: undefined },
    /** Whether the content avoids collisions with the viewport. */
    avoidCollisions: { type: Boolean, default: undefined },
});
const emits = defineEmits([
    "openAutoFocus",
    "closeAutoFocus",
    "escapeKeyDown",
    "pointerDownOutside",
    "focusOutside",
    "interactOutside",
]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ShellPopoverContent", props);
</script>

<template>
    <PopoverPortal>
        <PopoverContent
            data-slot="popover-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="[theme('root'), props.class]"
        >
            <slot />
        </PopoverContent>
    </PopoverPortal>
</template>
