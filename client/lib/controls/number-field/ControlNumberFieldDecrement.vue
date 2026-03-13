<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { Minus } from "lucide-vue-next";
import { NumberFieldDecrement, useForwardProps } from "reka-ui";

/**
 * A decrement button for ControlNumberField, absolutely positioned to the left
 * of the input and rendering a Minus icon by default.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** When true, disables the decrement button. */
    disabled: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: "button" },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);
</script>

<template>
    <NumberFieldDecrement
        data-slot="decrement"
        v-bind="forwarded"
        :class="
            cn(
                'absolute top-1/2 -translate-y-1/2 left-0 p-3 disabled:cursor-not-allowed disabled:opacity-20',
                props.class,
            )
        "
    >
        <slot>
            <Minus class="h-4 w-4" />
        </slot>
    </NumberFieldDecrement>
</template>
