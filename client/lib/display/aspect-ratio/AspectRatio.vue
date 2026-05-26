<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { AspectRatio } from "reka-ui";

/**
 * Constrains content to a given aspect ratio using Reka UI's AspectRatio primitive.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The desired aspect ratio (e.g. 16/9). */
    ratio: { type: Number, default: 1 },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const theme = useTheme("AspectRatio", props);
</script>

<template>
    <AspectRatio
        v-slot="slotProps"
        data-slot="aspect-ratio"
        v-bind="delegatedProps"
        :class="[theme('root'), props.class]"
    >
        <slot v-bind="slotProps" />
    </AspectRatio>
</template>
