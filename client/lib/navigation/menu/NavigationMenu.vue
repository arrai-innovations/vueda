<script setup>
import NavigationMenuViewport from "./NavigationMenuViewport.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactiveOmit } from "@vueuse/core";
import { NavigationMenuRoot, useForwardPropsEmits } from "reka-ui";

/**
 * The root provider for a navigation menu.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element instead of rendering a wrapper. */
    asChild: { type: Boolean, default: false },
    /** The controlled value of the active menu item. */
    modelValue: { type: String, default: undefined },
    /** The value of the menu item that should be active when initially rendered. */
    defaultValue: { type: String, default: undefined },
    /** The reading direction of the menu. */
    dir: { type: String, default: undefined },
    /** The orientation of the menu. */
    orientation: { type: String, default: undefined },
    /** The duration in ms from when the pointer enters the trigger until the tooltip opens. */
    delayDuration: { type: Number, default: undefined },
    /** How much time a user has to enter another trigger without incurring a delay again. */
    skipDelayDuration: { type: Number, default: undefined },
    /** When true, menu cannot be opened by clicking on trigger. */
    disableClickTrigger: { type: Boolean, default: undefined },
    /** When true, menu cannot be opened by hovering on trigger. */
    disableHoverTrigger: { type: Boolean, default: undefined },
    /** When true, menu will not close during pointer leave event. */
    disablePointerLeaveClose: { type: Boolean, default: undefined },
    /** When true, the element will be unmounted on closed state. */
    unmountOnHide: { type: Boolean, default: undefined },
    /** When true, renders a viewport element below the menu list. */
    viewport: { type: Boolean, default: true },
});

const emits = defineEmits(["update:modelValue"]);

const delegatedProps = reactiveOmit(props, "class", "themeOverride", "viewport");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
const theme = useTheme("NavigationMenu", props);
</script>

<template>
    <NavigationMenuRoot
        v-slot="slotProps"
        data-slot="navigation-menu"
        :data-viewport="viewport"
        v-bind="forwarded"
        :class="[theme('root'), props.class]"
    >
        <slot v-bind="slotProps" />
        <NavigationMenuViewport v-if="viewport" />
    </NavigationMenuRoot>
</template>
