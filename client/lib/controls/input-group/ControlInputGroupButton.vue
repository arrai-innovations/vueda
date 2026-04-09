<script setup>
import { ControlButton } from "@vueda/controls/button";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

/**
 * A sized button variant designed for inline placement within an input group.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The button style variant. */
    variant: { type: String, default: "ghost" },
    /** The size variant for the button within the input group. */
    size: { type: String, default: "xs" },
    /** Additional CSS classes to apply to the button. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme(
    "ControlInputGroupButton",
    props,
    reactive({
        size: toRef(props, "size"),
    }),
);
</script>

<template>
    <ControlButton :data-size="props.size" :variant="props.variant" :class="[theme('root'), props.class]">
        <slot />
    </ControlButton>
</template>
