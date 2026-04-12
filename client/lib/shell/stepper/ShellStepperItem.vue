<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { StepperItem, useForwardProps } from "reka-ui";

/**
 * An individual step item within a Stepper.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The step number value of this item. */
    step: { type: Number, required: true },
    /** Whether the step item is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** Whether the step is completed. */
    completed: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardProps(delegatedProps);
const theme = useTheme("ShellStepperItem", props);
</script>

<template>
    <StepperItem v-slot="slotProps" v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot v-bind="slotProps" />
    </StepperItem>
</template>
