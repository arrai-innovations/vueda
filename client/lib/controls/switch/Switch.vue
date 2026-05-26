<script setup>
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { SwitchRoot, SwitchThumb } from "reka-ui";

/**
 * A toggle switch built on Reka UI's SwitchRoot, with a sliding thumb indicator.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the switch root. */
    class: { type: [String, Array, Object], default: undefined },
    /** The default checked state when uncontrolled. */
    defaultValue: { type: Boolean, default: undefined },
    /** The controlled checked state (used with v-model). */
    modelValue: { type: Boolean, default: undefined },
    /** Whether the switch is disabled. */
    disabled: { type: Boolean, default: undefined },
    /** The id applied to the underlying input element. */
    id: { type: String, default: undefined },
    /** The value submitted with a form when checked. */
    value: { type: String, default: undefined },
    /** The value representing the checked state. */
    trueValue: { type: [Boolean, String], default: undefined },
    /** The value representing the unchecked state. */
    falseValue: { type: [Boolean, String], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** The name submitted with a form. */
    name: { type: String, default: undefined },
    /** Whether the field is required. */
    required: { type: Boolean, default: undefined },
});

const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("Switch", props);
</script>

<template>
    <SwitchRoot v-slot="slotProps" data-slot="switch" v-bind="forwarded" :class="[theme('root'), props.class]">
        <SwitchThumb data-slot="switch-thumb" :class="theme('thumb')">
            <slot name="thumb" v-bind="slotProps" />
        </SwitchThumb>
    </SwitchRoot>
</template>
