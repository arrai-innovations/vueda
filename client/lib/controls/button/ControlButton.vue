<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { Primitive } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * @typedef {'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'} ButtonVariant
 */

/**
 * @typedef {'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'} ButtonSize
 */

/**
 * A button control built on Reka UI's Primitive, supporting variant and size styles via the theme system.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Visual style variant.
     * @type {'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'}
     */
    variant: { type: String, default: undefined },
    /**
     * Size variant.
     * @type {'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'}
     */
    size: { type: String, default: undefined },
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: "button" },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const theme = useTheme(
    "ControlButton",
    props,
    reactive({
        variant: toRef(props, "variant"),
        size: toRef(props, "size"),
    }),
);
</script>

<template>
    <Primitive
        data-slot="button"
        :data-variant="variant"
        :data-size="size"
        :as="as"
        :as-child="asChild"
        :class="[theme('root'), props.class]"
    >
        <slot />
    </Primitive>
</template>
