<script setup>
import { MinusIcon } from "lucide-vue-next";

/**
 * A visual separator between OTP slot groups, rendering a minus icon by default.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    /** Additional CSS classes to apply to the separator element. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div data-slot="input-otp-separator" role="separator" v-bind="$attrs" :class="props.class">
        <slot>
            <MinusIcon />
        </slot>
    </div>
</template>
