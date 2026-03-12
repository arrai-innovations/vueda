<script setup>
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ProgressIndicator, ProgressRoot } from "reka-ui";

/**
 * A progress bar component built on Reka UI's ProgressRoot.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The current progress value (0 to max). */
    modelValue: { type: Number, default: 0 },
    /** The maximum value. */
    max: { type: Number, default: undefined },
    /** A function that returns the accessible label for the current value. */
    getValueLabel: { type: Function, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <ProgressRoot
        data-slot="progress"
        v-bind="delegatedProps"
        :class="cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', props.class)"
    >
        <ProgressIndicator
            data-slot="progress-indicator"
            class="bg-primary h-full w-full flex-1 transition-all"
            :style="`transform: translateX(-${100 - (props.modelValue ?? 0)}%);`"
        />
    </ProgressRoot>
</template>
