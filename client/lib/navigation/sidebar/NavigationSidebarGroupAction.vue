<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { Primitive } from "reka-ui";

/**
 * An action button shown at the top-right of a sidebar group.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
    /** The element or component to render as. */
    as: { type: [String, Object], default: undefined },
    /** When true, merges props onto the child element. */
    asChild: { type: Boolean, default: false },
});

const theme = useTheme("NavigationSidebarGroupAction", props);
</script>

<template>
    <Primitive
        data-slot="sidebar-group-action"
        data-sidebar="group-action"
        :as="as"
        :as-child="asChild"
        :class="[theme('root'), props.class]"
    >
        <slot />
    </Primitive>
</template>
