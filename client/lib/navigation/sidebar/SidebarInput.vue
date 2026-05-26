<script setup>
import Input from "@vueda/controls/input/Input.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A search or filter input styled for use inside the sidebar.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("SidebarInput", props);
</script>

<template>
    <Input data-slot="sidebar-input" data-sidebar="input" :class="[theme('root'), props.class]" />
</template>
