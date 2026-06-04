<script setup>
import "@vueda/theme/vueda-tailwind/controls/ButtonGroup.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

/**
 * A container that groups related buttons into a single visual unit.
 * Applies border-radius and border adjustments to adjacent children based on orientation.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the group container. */
    class: { type: [String, Array, Object], default: undefined },
    /** The layout direction of the group. */
    orientation: { type: String, default: undefined },
});

const theme = useTheme(
    "ButtonGroup",
    props,
    reactive({
        orientation: toRef(props, "orientation"),
    }),
);
</script>

<template>
    <div
        role="group"
        data-slot="button-group"
        :data-orientation="props.orientation"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </div>
</template>
