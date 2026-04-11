<script setup>
import ControlInput from "@vueda/controls/input/ControlInput.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A search or filter input styled for use inside the sidebar.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("NavigationSidebarInput", props);
</script>

<template>
    <ControlInput data-slot="sidebar-input" data-sidebar="input" :class="[theme('root'), props.class]" />
</template>
