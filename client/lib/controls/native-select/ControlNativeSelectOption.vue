<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A styled wrapper for the native `<option>` element used inside ControlNativeSelect.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the option element. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <option data-slot="native-select-option" :class="cn('bg-popover text-popover-foreground', props.class)">
        <slot />
    </option>
</template>
