<script setup>
import Button from "@vueda/controls/button/Button.vue";
import "@vueda/theme/vueda-tailwind/controls/InputGroupButton.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

/**
 * A sized button emphasis designed for inline placement within an input group.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The button color axis. */
    tone: { type: String, default: undefined },
    /** The button structure axis. */
    emphasis: { type: String, default: "ghost" },
    /** The size variant for the button within the input group. */
    size: { type: String, default: "xs" },
    /** Additional CSS classes to apply to the button. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme(
    "InputGroupButton",
    props,
    reactive({
        size: toRef(props, "size"),
    }),
);
</script>

<template>
    <Button
        :data-size="props.size"
        :tone="props.tone"
        :emphasis="props.emphasis"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </Button>
</template>
