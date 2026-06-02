<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { Primitive } from "reka-ui";

/**
 * A text label element that can be placed inside a ButtonGroup.
 * Renders with muted background styling to visually complement adjacent buttons.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the element. */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: "div" },
    /** Whether to render as the child element (slot passthrough). */
    asChild: { type: Boolean, default: undefined },
    /** The layout direction of the parent button group. */
    orientation: { type: String, default: undefined },
});

const theme = useTheme("ButtonGroupText", props);
</script>

<template>
    <Primitive
        role="group"
        data-slot="button-group-text"
        :data-orientation="props.orientation"
        :as="as"
        :as-child="asChild"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </Primitive>
</template>
