<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { StepperTrigger, useForwardProps } from "reka-ui";

/**
 * The clickable trigger area for a StepperItem.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardProps(delegatedProps);
const theme = useTheme("ShellStepperTrigger", props);
</script>

<template>
    <StepperTrigger v-bind="forwarded" :class="[theme('root'), props.class]">
        <slot />
    </StepperTrigger>
</template>
