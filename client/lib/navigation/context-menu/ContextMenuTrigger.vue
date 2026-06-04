<script setup>
import "@vueda/theme/vueda-tailwind/navigation/ContextMenuTrigger.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { ContextMenuTrigger, useForwardProps } from "reka-ui";

/**
 * The area that triggers a context menu on right-click.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** When true, the context menu will not open on right-click. */
    disabled: { type: Boolean, default: undefined },
});

const delegatedProps = reactiveOmit(props, "class", "themeOverride");
const forwardedProps = useForwardProps(delegatedProps);
const theme = useTheme("ContextMenuTrigger", props);
</script>

<template>
    <ContextMenuTrigger
        data-slot="context-menu-trigger"
        v-bind="forwardedProps"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </ContextMenuTrigger>
</template>
