<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A flex container that groups OTP slot elements horizontally.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    /** Additional CSS classes to apply to the group container. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div data-slot="input-otp-group" v-bind="$attrs" :class="cn('flex items-center', props.class)">
        <slot />
    </div>
</template>
