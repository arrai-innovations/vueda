<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";

/**
 * 12-column form-field grid for `ViewCreate`/`ViewUpdate` long-form
 * layouts. Direct children default to a full 12-column span and collapse
 * to a single column under 720 px. Children stamped with
 * `data-col="3|4|6|8|9"` claim that many columns at >=720 px.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Additional CSS classes applied to the grid root.
     *
     * @type {import('vue').HTMLAttributes['class']}
     */
    class: { type: [String, Array, Object], default: undefined },
});

const theme = useTheme("FormGrid", props);
</script>

<template>
    <div
        data-slot="form-grid"
        :class="[theme('root'), props.class]"
        :style="theme.hideStyle?.value"
        data-qa="form-grid"
    >
        <slot />
    </div>
</template>
