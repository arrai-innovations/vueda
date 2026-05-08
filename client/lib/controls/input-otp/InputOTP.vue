<script setup>
import { useForwardPropsEmits } from "@vueda/use/useForwardPropsEmits.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { computed, normalizeClass } from "vue";
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

const emits = defineEmits({
    /** Emitted when the value changes. */
    "update:modelValue": null,
    /** Emitted when all slots are filled. */
    complete: null,
    /** Emitted when the value changes. */
    change: null,
    /** Emitted when an item is selected. */
    select: null,
    /** Emitted on each keystroke. */
    input: null,
    /** Emitted when the input gains focus. */
    focus: null,
    /** Emitted when the input loses focus. */
    blur: null,
    /** Emitted when the pointer enters the element. */
    mouseover: null,
    /** Emitted when the pointer leaves the element. */
    mouseleave: null,
    /** Emitted when the user pastes into the input. */
    paste: null,
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const theme = useTheme("InputOTP", props);

const containerClass = computed(() => normalizeClass([theme("root"), props.class]));
</script>

<template>
    <OTPInput
        v-slot="slotProps"
        v-bind="{ ...forwarded, ...$attrs }"
        :container-class="containerClass"
        data-slot="input-otp"
        class="disabled:cursor-not-allowed"
    >
        <slot v-bind="slotProps" />
    </OTPInput>
</template>
