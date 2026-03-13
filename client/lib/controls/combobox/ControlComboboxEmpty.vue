<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxEmpty } from "reka-ui";

/**
 * Shown inside ControlComboboxList when no items match the current search.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <ComboboxEmpty
        data-slot="combobox-empty"
        v-bind="delegatedProps"
        :class="cn('py-6 text-center text-sm', props.class)"
    >
        <slot />
    </ComboboxEmpty>
</template>
