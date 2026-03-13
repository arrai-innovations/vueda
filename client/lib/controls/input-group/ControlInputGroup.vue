<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A container that groups an input with inline addons, buttons, or text, with coordinated focus and error states.
 */
defineOptions({ inheritAttrs: false });

const props = defineProps({
    /** Additional CSS classes to apply to the input group container. */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <div
        data-slot="input-group"
        role="group"
        v-bind="$attrs"
        :class="
            cn(
                'group/input-group border-input dark:bg-input/30 relative flex w-full items-center rounded-md border shadow-xs transition-[color,box-shadow] outline-none',
                'h-9 min-w-0 has-[>textarea]:h-auto',

                'has-[>[data-align=inline-start]]:[&>input]:pl-2',
                'has-[>[data-align=inline-end]]:[&>input]:pr-2',
                'has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3',
                'has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3',

                'has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot=input-group-control]:focus-visible]:ring-[3px]',

                'has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40',

                props.class,
            )
        "
    >
        <slot />
    </div>
</template>
