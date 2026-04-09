<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Header section of a Sheet, typically containing the title and description.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellSheetHeader", props);
</script>

<template>
    <div data-slot="sheet-header" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
