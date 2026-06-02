<script setup>
import Skeleton from "@vueda/feedback/skeleton/Skeleton.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { getSkeletonClassForField } from "@vueda/utils/objectGridSkeletonClass.js";

/**
 * Renders a single table-layout body cell skeleton placeholder while
 * ObjectsGrid data is loading. Sizes the skeleton based on the field
 * definition.
 */
defineOptions({});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Field definition used to size the skeleton placeholder. */
    field: {
        type: Object,
        required: true,
    },
});
const theme = useTheme("ObjectsGridBodyCell", props);
</script>
<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value">
        <Skeleton :class="getSkeletonClassForField(field)" />
    </div>
</template>
