<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A vertical stack container for grouping multiple ShellField instances,
 * with consistent spacing and container-query support for responsive layouts.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="field-group"
        :class="
            cn(
                'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
                props.class,
            )
        "
    >
        <slot />
    </div>
</template>
