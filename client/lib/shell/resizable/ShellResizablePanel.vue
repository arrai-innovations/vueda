<script setup>
import { SplitterPanel, useForwardExpose, useForwardPropsEmits } from "reka-ui";

/**
 * A resizable panel managed by a ResizablePanelGroup.
 */
defineOptions({});

const props = defineProps({
    /** The default size of the panel as a percentage. */
    defaultSize: { type: Number, default: undefined },
    /** The minimum size of the panel as a percentage. */
    minSize: { type: Number, default: undefined },
    /** The maximum size of the panel as a percentage. */
    maxSize: { type: Number, default: undefined },
    /** The id of the panel. */
    id: { type: String, default: undefined },
    /** The order of the panel in the group. */
    order: { type: Number, default: undefined },
    /** Whether the panel can be collapsed. */
    collapsible: { type: Boolean, default: undefined },
    /** The collapsed size of the panel as a percentage. */
    collapsedSize: { type: Number, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
const emits = defineEmits({
    /** Emitted when the panel collapses. */
    collapse: null,
    /** Emitted when the panel expands. */
    expand: null,
    /** Emitted when the panel is resized. */
    resize: null,
});

const forwarded = useForwardPropsEmits(props, emits);
const { forwardRef } = useForwardExpose();
</script>

<template>
    <SplitterPanel :ref="forwardRef" v-slot="slotProps" data-slot="resizable-panel" v-bind="forwarded">
        <slot v-bind="slotProps" />
    </SplitterPanel>
</template>
