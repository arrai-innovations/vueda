<script setup>
import Separator from "@vueda/shell/separator/Separator.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A horizontal rule that visually divides sections within a field group,
 * optionally displaying a centered text label over the line.
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

const theme = useTheme("FieldSeparator", props);
</script>

<template>
    <div data-slot="field-separator" :data-content="!!$slots.default" :class="[theme('root'), props.class]">
        <Separator :class="theme('line')" />
        <span v-if="$slots.default" :class="theme('content')" data-slot="field-separator-content">
            <slot />
        </span>
    </div>
</template>
