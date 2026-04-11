<script setup>
import ShellSeparator from "@vueda/shell/separator/ShellSeparator.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";

/**
 * A visual divider placed between items in a ControlButtonGroup.
 * Stretches to fill the button group's cross-axis.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the separator. */
    class: { type: [String, Array, Object], default: undefined },
    /** The orientation of the separator line. */
    orientation: { type: String, default: "vertical" },
    /** Whether the separator is purely decorative (hidden from assistive tech). */
    decorative: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const theme = useTheme("ControlButtonGroupSeparator", props);
</script>

<template>
    <ShellSeparator
        data-slot="button-group-separator"
        v-bind="delegatedProps"
        :orientation="props.orientation"
        :class="[theme('root'), props.class]"
    />
</template>
