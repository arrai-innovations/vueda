<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { useForwardPropsEmits } from "reka-ui";
import { OTPInput } from "vue-input-otp";

/**
 * A styled OTP (one-time password) input built on vue-input-otp's OTPInput, with slot forwarding for custom slot rendering.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the container element. */
    class: { type: [String, Array, Object], default: undefined },
    /** The controlled value (used with v-model). */
    modelValue: { type: String, default: undefined },
    /** The maximum length (number of OTP slots). Required. */
    maxlength: { type: Number, required: true },
    /** Text alignment of characters within slots. */
    textAlign: { type: String, default: undefined },
    /** Input mode for the underlying input element. */
    inputmode: { type: String, default: undefined },
    /** Additional CSS class applied to the container div (overridden internally). */
    containerClass: { type: String, default: undefined },
    /** Strategy for handling password manager icon placement. */
    pushPasswordManagerStrategy: { type: String, default: undefined },
    /** CSS fallback string injected via noscript for browsers without JS. */
    noScriptCssFallback: { type: String, default: undefined },
    /** The default value when uncontrolled. */
    defaultValue: { type: String, default: undefined },
    /** A function to transform pasted text before applying it. */
    pasteTransformer: { type: Function, default: undefined },
});

const emits = defineEmits([
    "update:modelValue",
    "complete",
    "change",
    "select",
    "input",
    "focus",
    "blur",
    "mouseover",
    "mouseleave",
    "paste",
]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("ControlInputOTP", props);
</script>

<template>
    <OTPInput
        v-slot="slotProps"
        v-bind="{ ...forwarded, ...$attrs }"
        :container-class="[theme('root'), props.class]"
        data-slot="input-otp"
        class="disabled:cursor-not-allowed"
    >
        <slot v-bind="slotProps" />
    </OTPInput>
</template>
