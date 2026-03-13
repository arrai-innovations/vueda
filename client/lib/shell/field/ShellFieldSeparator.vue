<script setup>
import { ShellSeparator } from "@vueda/shell/separator/index.js";
import { cn } from "@vueda/utils/cn.js";

/**
 * A horizontal rule that visually divides sections within a field group,
 * optionally displaying a centered text label over the line.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="field-separator"
        :data-content="!!$slots.default"
        :class="cn('relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2', props.class)"
    >
        <ShellSeparator class="absolute inset-0 top-1/2" />
        <span
            v-if="$slots.default"
            class="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
            data-slot="field-separator-content"
        >
            <slot />
        </span>
    </div>
</template>
