<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A semantic fieldset that groups related form controls with consistent vertical spacing,
 * adjusting gap for checkbox and radio groups automatically.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});
</script>

<template>
    <fieldset
        data-slot="field-set"
        :class="
            cn(
                'flex flex-col gap-6',
                'has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
                props.class,
            )
        "
    >
        <slot />
    </fieldset>
</template>
