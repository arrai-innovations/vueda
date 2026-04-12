<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ScrollAreaScrollbar, ScrollAreaThumb } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * The scrollbar track and thumb for a ScrollArea.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The orientation of the scrollbar. */
    orientation: { type: String, default: "vertical" },
    /** Whether to force mount the scrollbar. */
    forceMount: { type: Boolean, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const theme = useTheme("ShellScrollBar", props, reactive({ orientation: toRef(props, "orientation") }));
</script>

<template>
    <ScrollAreaScrollbar
        data-slot="scroll-area-scrollbar"
        v-bind="delegatedProps"
        :class="[theme('root'), props.class]"
    >
        <ScrollAreaThumb data-slot="scroll-area-thumb" :class="theme('thumb')" />
    </ScrollAreaScrollbar>
</template>
