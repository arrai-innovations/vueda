<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { Primitive } from "reka-ui";
import { reactive, toRef } from "vue";

/**
 * A contextual action button shown alongside a sidebar menu button.
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
    as: { type: [String, Object], default: "button" },
    /** When true, merges props onto the child element. */
    asChild: { type: Boolean, default: false },
    /** Whether to show the action only on hover. */
    showOnHover: { type: Boolean, default: false },
});

const theme = useTheme("SidebarMenuAction", props, reactive({ showOnHover: toRef(props, "showOnHover") }));
</script>

<template>
    <Primitive
        data-slot="sidebar-menu-action"
        data-sidebar="menu-action"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        :as="as"
        :as-child="asChild"
    >
        <slot />
    </Primitive>
</template>
