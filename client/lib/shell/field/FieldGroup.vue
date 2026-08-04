<script setup>
import "@vueda/theme/vueda-tailwind/shell/FieldGroup.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A vertical stack container for grouping multiple Field instances,
 * with consistent spacing and container-query support for responsive layouts.
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

const theme = useTheme("FieldGroup", props);
</script>

<template>
    <div data-slot="field-group" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </div>
</template>
