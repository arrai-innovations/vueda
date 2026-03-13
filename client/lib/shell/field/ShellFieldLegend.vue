<script setup>
import { cn } from "@vueda/utils/cn.js";

/**
 * A fieldset legend styled as either a section heading or a field label,
 * controlled by the variant prop.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Controls text size: "legend" renders at base size, "label" renders at sm size. */
    variant: { type: String, default: undefined },
});
</script>

<template>
    <legend
        data-slot="field-legend"
        :data-variant="variant"
        :class="cn('mb-3 font-medium', 'data-[variant=legend]:text-base', 'data-[variant=label]:text-sm', props.class)"
    >
        <slot />
    </legend>
</template>
