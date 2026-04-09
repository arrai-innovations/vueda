<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { SplitterGroup, useForwardPropsEmits } from "reka-ui";

/**
 * A container that manages a group of resizable panels.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The layout direction of the panels. */
    direction: { type: String, default: undefined },
    /** A unique id for the group. */
    id: { type: String, default: undefined },
    /** A key for persisting layout in storage. */
    autoSaveId: { type: String, default: undefined },
    /** The storage mechanism for persisting layout. */
    storage: { type: Object, default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
});
const emits = defineEmits(["layout"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("ShellResizablePanelGroup", props);
</script>

<template>
    <SplitterGroup
        v-slot="slotProps"
        data-slot="resizable-panel-group"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
    >
        <slot v-bind="slotProps" />
    </SplitterGroup>
</template>
