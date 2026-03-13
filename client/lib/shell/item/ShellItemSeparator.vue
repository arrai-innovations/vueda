<script setup>
import { ShellSeparator } from "@vueda/shell/separator";
import { cn } from "@vueda/utils/cn.js";

/**
 * A horizontal separator rule used to divide sections within a ShellItem or ShellItemGroup.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the separator. */
    class: { type: [String, Array, Object], default: undefined },
    /** Whether the separator is purely decorative (hidden from assistive tech). */
    decorative: { type: Boolean, default: undefined },
});
</script>

<template>
    <ShellSeparator
        data-slot="item-separator"
        orientation="horizontal"
        :decorative="props.decorative"
        :class="cn('my-0', props.class)"
    />
</template>
