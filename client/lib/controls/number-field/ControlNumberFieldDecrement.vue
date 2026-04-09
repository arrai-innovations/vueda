<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { NumberFieldDecrement, useForwardProps } from "reka-ui";

/**
 * A decrement button for ControlNumberField, absolutely positioned to the left
 * of the input and rendering a Minus icon by default.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** When true, disables the decrement button. */
    disabled: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: "button" },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardProps(delegatedProps);

const theme = useTheme("ControlNumberFieldDecrement", props);
</script>

<template>
    <NumberFieldDecrement data-slot="decrement" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot>
            <span aria-hidden="true" class="select-none">−</span>
        </slot>
    </NumberFieldDecrement>
</template>
