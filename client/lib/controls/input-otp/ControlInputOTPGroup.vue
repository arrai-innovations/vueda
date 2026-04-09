<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A flex container that groups OTP slot elements horizontally.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Additional CSS classes to apply to the group container. */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ControlInputOTPGroup", props);
</script>

<template>
    <div data-slot="input-otp-group" v-bind="$attrs" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
