<script setup>
import Label from "@vueda/shell/label/Label.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A field label built on Label that optionally wraps an inline control,
 * applying checked-state highlights when paired with a checkbox or radio.
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

const theme = useTheme("FieldLabel", props);
</script>

<template>
    <Label data-slot="field-label" :class="[theme('root'), props.class]" :style="theme.hideStyle?.value">
        <slot />
    </Label>
</template>
