<script setup>
import "@vueda/theme/vueda-tailwind/shell/FieldTitle.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A non-interactive label-styled div for titling a field when a semantic label
 * element is not appropriate, such as when the field contains its own label.
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

const theme = useTheme("FieldTitle", props);
</script>

<template>
    <div data-slot="field-label" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </div>
</template>
