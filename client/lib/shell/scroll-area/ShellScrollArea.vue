<script setup>
import ShellScrollBar from "./ShellScrollBar.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ScrollAreaCorner, ScrollAreaRoot, ScrollAreaViewport } from "reka-ui";

/**
 * A scroll area component built on Reka UI's ScrollAreaRoot with a custom scrollbar.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
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

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("ShellScrollArea", props);
</script>

<template>
    <ScrollAreaRoot data-slot="scroll-area" v-bind="delegatedProps" :class="[theme('root'), props.class]">
        <ScrollAreaViewport data-slot="scroll-area-viewport" :class="theme('viewport')">
            <slot />
        </ScrollAreaViewport>
        <ShellScrollBar />
        <ScrollAreaCorner />
    </ScrollAreaRoot>
</template>
