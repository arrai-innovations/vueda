<script setup>
import { resolveButtonVariant } from "@vueda/controls/button/buttonVariant.js";
import "@vueda/theme/vueda-tailwind/controls/Button.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { Primitive } from "reka-ui";
import { computed, reactive, toRef } from "vue";

/**
 * @typedef {'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'} ButtonVariant
 */

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
 * `tone` (color) and `emphasis` (structure); the legacy `variant` prop is a
 * shorthand that maps to a (tone, emphasis) pair. Explicit `tone` / `emphasis`
 * override the variant-derived value per axis, so `variant="link" tone="destructive"`
 * yields a destructive text button. Size styles also resolve via the theme system.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Visual style shorthand. Maps to a (tone, emphasis) pair; see {@link ButtonTone} / {@link ButtonEmphasis}.
     * @type {'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'}
     */
    variant: { type: String, default: undefined },
    /**
     * Color axis. Overrides the tone implied by `variant`.
     * @type {'neutral' | 'primary' | 'destructive'}
     */
    tone: { type: String, default: undefined },
    /**
     * Structure axis. Overrides the emphasis implied by `variant`.
     * @type {'fill' | 'outline' | 'ghost' | 'link'}
     */
    emphasis: { type: String, default: undefined },
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
    "Button",
    props,
    reactive({
        variant: toRef(props, "variant"),
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
        :data-variant="variant"
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
