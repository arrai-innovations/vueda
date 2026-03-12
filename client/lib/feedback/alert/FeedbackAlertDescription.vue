<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * The description element inside an Alert component.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="alert-description"
        :class="
            cn(
                'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
                props.class,
            )
        "
    >
        <slot />
    </div>
</template>
