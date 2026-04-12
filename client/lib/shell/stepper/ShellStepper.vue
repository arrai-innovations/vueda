<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { StepperRoot, useForwardPropsEmits } from "reka-ui";

/**
 * Root stepper component built on Reka UI's StepperRoot.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled active step value. */
    modelValue: { type: Number, default: undefined },
    /** The default active step value. */
    defaultValue: { type: Number, default: undefined },
    /** The orientation of the stepper. */
    orientation: { type: String, default: undefined },
    /** The reading direction. */
    dir: { type: String, default: undefined },
    /** The linear mode setting. */
    linear: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ShellStepper", props);
</script>

<template>
    <StepperRoot v-slot="slotProps" :class="[theme('root'), props.class]" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </StepperRoot>
</template>
