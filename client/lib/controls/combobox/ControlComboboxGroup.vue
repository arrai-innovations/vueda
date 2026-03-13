<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ComboboxGroup, ComboboxLabel } from "reka-ui";

/**
 * Groups related ControlComboboxItem elements with an optional heading.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** Optional group heading text. */
    heading: { type: String, default: undefined },
    /** The HTML element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** Whether to render as a child element. */
    asChild: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <ComboboxGroup
        data-slot="combobox-group"
        v-bind="delegatedProps"
        :class="cn('overflow-hidden p-1 text-foreground', props.class)"
    >
        <ComboboxLabel v-if="heading" class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {{ heading }}
        </ComboboxLabel>
        <slot />
    </ComboboxGroup>
</template>
