<script setup>
import { cn } from "@vueda/utils/cn.js";
import { Primitive } from "reka-ui";

/**
 * A text label element that can be placed inside a ControlButtonGroup.
 * Renders with muted background styling to visually complement adjacent buttons.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the element. */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: "div" },
    /** Whether to render as the child element (slot passthrough). */
    asChild: { type: Boolean, default: undefined },
    /** The layout direction of the parent button group. */
    orientation: { type: String, default: undefined },
});
</script>

<template>
    <Primitive
        role="group"
        data-slot="button-group"
        :data-orientation="props.orientation"
        :as="as"
        :as-child="asChild"
        :class="
            cn(
                'bg-muted flex items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4',
                props.class,
            )
        "
    >
        <slot />
    </Primitive>
</template>
