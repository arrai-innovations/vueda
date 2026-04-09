<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { RadioGroupRoot, useForwardPropsEmits } from "reka-ui";

/**
 * A radio group container built on Reka UI's RadioGroupRoot,
 * providing keyboard navigation and v-model binding for a set of radio items.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled value of the checked radio item. */
    modelValue: { type: [String, Number, Boolean, Object], default: undefined },
    /** The default value when uncontrolled. */
    defaultValue: { type: [String, Number, Boolean, Object], default: undefined },
    /** When true, prevents interaction with all radio items. */
    disabled: { type: Boolean, default: false },
    /** When true, keyboard navigation loops from last item back to first. */
    loop: { type: Boolean, default: true },
    /** The orientation of the radio group. */
    orientation: { type: String, default: undefined },
    /** The reading direction of the group. */
    dir: { type: String, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** The name of the group submitted with form data. */
    name: { type: String, default: undefined },
    /** When true, the user must select a value before submitting the form. */
    required: { type: Boolean, default: false },
});

const emits = defineEmits(["update:modelValue"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("ControlRadioGroup", props);
</script>

<template>
    <RadioGroupRoot v-slot="slotProps" data-slot="radio-group" :class="[theme('root'), props.class]" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </RadioGroupRoot>
</template>
