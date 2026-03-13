<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A paragraph that provides supplementary context for a field,
 * styled with muted text and link decorations.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <p
        data-slot="field-description"
        :class="
            cn(
                'text-muted-foreground text-sm leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance',
                'last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5',
                '[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
                props.class,
            )
        "
    >
        <slot />
    </p>
</template>
