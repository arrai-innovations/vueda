<script setup>
import ShellScrollBar from "./ShellScrollBar.vue";
import { cn } from "@vueda/utils/cn.js";
import { reactiveOmit } from "@vueuse/core";
import { ScrollAreaCorner, ScrollAreaRoot, ScrollAreaViewport } from "reka-ui";

/**
 * A scroll area component built on Reka UI's ScrollAreaRoot with a custom scrollbar.
 */
defineOptions({});

const props = defineProps({
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The scroll direction(s) to allow. */
    dir: { type: String, default: undefined },
    /** The scrollbar display type. */
    type: { type: String, default: undefined },
    /** The delay in ms before the scrollbar hides (when type is "scroll"). */
    scrollHideDelay: { type: Number, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
    <ScrollAreaRoot data-slot="scroll-area" v-bind="delegatedProps" :class="cn('relative', props.class)">
        <ScrollAreaViewport
            data-slot="scroll-area-viewport"
            class="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
        >
            <slot />
        </ScrollAreaViewport>
        <ShellScrollBar />
        <ScrollAreaCorner />
    </ScrollAreaRoot>
</template>
