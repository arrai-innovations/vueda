<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { Plus } from "lucide-vue-next";
import { NumberFieldIncrement, useForwardProps } from "reka-ui";

/**
 * An increment button for ControlNumberField, absolutely positioned to the right
 * of the input and rendering a Plus icon by default.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** When true, disables the increment button. */
    disabled: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: "button" },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardProps(delegatedProps);

const theme = useTheme("ControlNumberFieldIncrement", props);
</script>

<template>
    <NumberFieldIncrement data-slot="increment" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot>
            <Plus class="h-4 w-4" />
        </slot>
    </NumberFieldIncrement>
</template>
