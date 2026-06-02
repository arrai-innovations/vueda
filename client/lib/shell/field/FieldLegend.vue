<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * A fieldset legend styled as either a section heading or a field label,
 * controlled by the variant prop.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Controls text size: "legend" renders at base size, "label" renders at sm size. */
    variant: { type: String, default: undefined },
});

const theme = useTheme("FieldLegend", props);
</script>

<template>
    <legend
        data-slot="field-legend"
        :data-variant="variant"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </legend>
</template>
