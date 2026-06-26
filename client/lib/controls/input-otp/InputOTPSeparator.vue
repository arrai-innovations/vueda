<script setup>
import { useIcons } from "@vueda/use/useIcons.js";

/**
 * A visual separator between OTP slot groups, rendering a minus icon by default.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    /** Additional CSS classes to apply to the separator element. */
    class: { type: [String, Array, Object], default: undefined },
});

const icon = useIcons("InputOTPSeparator");
</script>

<template>
    <div data-slot="input-otp-separator" role="separator" v-bind="$attrs" :class="props.class">
        <slot>
            <component
                :is="icon('minus').component"
                v-if="icon('minus')"
                v-bind="icon('minus').props"
                aria-hidden="true"
            />
            <span v-else aria-hidden="true" class="select-none">−</span>
        </slot>
    </div>
</template>
