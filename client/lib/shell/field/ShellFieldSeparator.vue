<script setup>
import ShellSeparator from "@vueda/shell/separator/ShellSeparator.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A horizontal rule that visually divides sections within a field group,
 * optionally displaying a centered text label over the line.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** @type {import('vue').HTMLAttributes['class']} */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("ShellFieldSeparator", props);
</script>

<template>
    <div data-slot="field-separator" :data-content="!!$slots.default" :class="[theme('root'), props.class]">
        <ShellSeparator :class="theme('line')" />
        <span v-if="$slots.default" :class="theme('content')" data-slot="field-separator-content">
            <slot />
        </span>
    </div>
</template>
