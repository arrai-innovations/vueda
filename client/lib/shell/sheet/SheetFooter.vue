<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * Footer section of a Sheet, typically containing action buttons.
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

const theme = useTheme("SheetFooter", props);
</script>

<template>
    <div data-slot="sheet-footer" :class="[theme('root'), props.class]">
        <slot />
    </div>
</template>
