<script setup>
import "@vueda/theme/vueda-tailwind/shell/Field.theme.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { reactive, toRef } from "vue";

/**
 * A form field layout container that groups a label, control, and supporting text
 * with configurable vertical, horizontal, or responsive orientation.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes to apply to the root element.
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
    /** Controls whether the label and input stack vertically, sit side by side, or switch layout responsively. */
    orientation: { type: String, default: undefined },
});

const theme = useTheme("Field", props, reactive({ orientation: toRef(props, "orientation") }));
</script>

<template>
    <div
        role="group"
        data-slot="field"
        :data-orientation="orientation"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
    >
        <slot />
    </div>
</template>
