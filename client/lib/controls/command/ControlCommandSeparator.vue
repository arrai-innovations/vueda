<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { Separator } from "reka-ui";

/**
 * A visual divider between groups or items within ControlCommandList.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Orientation of the separator. */
    orientation: { type: String, default: undefined },
    /** When true, the separator is purely decorative and removed from the accessibility tree. */
    decorative: { type: Boolean, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const theme = useTheme("ControlCommandSeparator", props);
</script>

<template>
    <Separator data-slot="command-separator" v-bind="delegatedProps" :class="[theme('root'), props.class]">
        <slot />
    </Separator>
</template>
