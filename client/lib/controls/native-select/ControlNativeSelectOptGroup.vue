<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A styled wrapper for the native `<optgroup>` element used inside ControlNativeSelect.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the optgroup element. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <optgroup data-slot="native-select-optgroup" :class="cn('bg-popover text-popover-foreground', props.class)">
        <slot />
    </optgroup>
</template>
