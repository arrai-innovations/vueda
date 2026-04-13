<script setup>
import Skeleton from "@vueda/feedback/skeleton/Skeleton.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { getSkeletonClassForField } from "@vueda/utils/objectGridSkeletonClass.js";

/**
 * Renders a single card-layout cell skeleton placeholder while ObjectsGrid
 * data is loading. Displays the field label alongside a sized skeleton for
 * the value area.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Field definition used to display the label and size the skeleton placeholder. */
    field: {
        type: Object,
        required: true,
    },
});
const theme = useTheme("ObjectsGridCardCell", props);
</script>
<template>
    <div :class="theme('header')">
        {{ field.label }}
    </div>
    <div :class="theme('value')">
        <Skeleton :class="getSkeletonClassForField(field)" />
    </div>
</template>
