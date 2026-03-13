<script setup>
import { ShellLabel } from "@vueda/shell/label/index.js";
import { cn } from "@vueda/utils/cn.js";

/**
 * A field label built on ShellLabel that optionally wraps an inline control,
 * applying checked-state highlights when paired with a checkbox or radio.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <ShellLabel
        data-slot="field-label"
        :class="
            cn(
                'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50',
                'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4',
                'has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10',
                props.class,
            )
        "
    >
        <slot />
    </ShellLabel>
</template>
