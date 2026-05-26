<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { useForwardProps } from "reka-ui";
import { computed } from "vue";
import { useVueOTPContext } from "vue-input-otp";

/**
 * An individual OTP character slot that displays the current character and an animated caret when active.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** The zero-based index of this slot within the OTP input. */
    index: { type: Number, required: true },
    /** Additional CSS classes to apply to the slot element. */
    class: { type: [String, Array, Object], default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardProps(delegatedProps);

const theme = useTheme("InputOTPSlot", props);

const context = useVueOTPContext();

const slot = computed(() => context?.value.slots[props.index]);
</script>

<template>
    <div
        v-bind="forwarded"
        data-slot="input-otp-slot"
        :data-active="slot?.isActive"
        :class="[theme('root'), props.class]"
    >
        {{ slot?.char }}
        <div v-if="slot?.hasFakeCaret" class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div class="animate-caret-blink bg-foreground h-4 w-px duration-1000" />
        </div>
    </div>
</template>
