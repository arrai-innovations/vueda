<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

/**
 * A badge displayed at the right of a sidebar menu button. Tone controls the chromatic
 * treatment: `neutral` auto-promotes to a sidebar-primary tint when the ancestor menu
 * button is active; `primary` and `destructive` force the corresponding tint regardless
 * of active state.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /**
     * Chromatic tone of the badge.
     * @type {'neutral' | 'primary' | 'destructive'}
     */
    tone: { type: String, default: "neutral" },
});

const theme = useTheme("SidebarMenuBadge", props, reactive({ tone: toRef(props, "tone") }));
</script>

<template>
    <div
        data-slot="sidebar-menu-badge"
        data-sidebar="menu-badge"
        :data-tone="tone"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </div>
</template>
