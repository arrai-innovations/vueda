<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { Separator } from "reka-ui";

/**
 * A visual separator between content sections, built on Reka UI's Separator.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The orientation of the separator. */
    orientation: { type: String, default: "horizontal" },
    /** Whether the separator is purely decorative and hidden from assistive technology. */
    decorative: { type: Boolean, default: true },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("Separator", props);
</script>

<template>
    <Separator data-slot="separator" v-bind="delegatedProps" :class="[theme('root'), props.class]" />
</template>
