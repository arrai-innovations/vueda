<script setup>
import { resolveButtonVariant } from "@vueda/controls/button/buttonVariant.js";
import "@vueda/theme/vueda-tailwind/controls/Button.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { Primitive } from "reka-ui";
import { computed, reactive, toRef } from "vue";

/**
 * @typedef {'neutral' | 'primary' | 'destructive'} ButtonTone
 */

/**
 * @typedef {'fill' | 'outline' | 'ghost' | 'link'} ButtonEmphasis
 */

/**
 * @typedef {'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'} ButtonSize
 */

/**
 * A button control built on Reka UI's Primitive. Its look resolves on two axes,
 * `tone` (color) and `emphasis` (structure). A bare button rests at neutral fill;
 * the primary fill is opt-in with `tone="primary"`. Size styles also resolve via
 * the theme system.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Color axis.
     * @type {'neutral' | 'primary' | 'destructive'}
     */
    tone: { type: String, default: undefined },
    /**
     * Structure axis.
     * @type {'fill' | 'outline' | 'ghost' | 'link'}
     */
    emphasis: { type: String, default: undefined },
    /**
     * Size axis.
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
    "Button",
    props,
    reactive({
        tone: toRef(props, "tone"),
        emphasis: toRef(props, "emphasis"),
        size: toRef(props, "size"),
    }),
);

// Resolved axes for the `data-tone` / `data-emphasis` attributes; the theme
// resolves the same pair independently for the composed primitive.
const resolved = computed(() => resolveButtonVariant(props));
</script>

<template>
    <Primitive
        data-slot="button"
        :data-tone="resolved.tone"
        :data-emphasis="resolved.emphasis"
        :data-size="size"
        :as="as"
        :as-child="asChild"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </Primitive>
</template>
