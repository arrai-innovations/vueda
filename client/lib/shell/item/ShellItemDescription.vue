<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A supporting description paragraph inside a ShellItem, styled with muted text and line clamping.
 */
defineOptions({});

const props = defineProps({
    /** Additional CSS classes to apply to the description element. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <p
        data-slot="item-description"
        :class="
            cn(
                'text-muted-foreground line-clamp-2 text-sm leading-normal font-normal text-balance',
                '[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
                props.class,
            )
        "
    >
        <slot />
    </p>
</template>
