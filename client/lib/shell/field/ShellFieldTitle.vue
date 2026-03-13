<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A non-interactive label-styled div for titling a field when a semantic label
 * element is not appropriate, such as when the field contains its own label.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="field-label"
        :class="
            cn(
                'flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50',
                props.class,
            )
        "
    >
        <slot />
    </div>
</template>
