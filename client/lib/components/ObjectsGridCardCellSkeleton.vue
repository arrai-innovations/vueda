<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { getSkeletonPropsForField } from "@vueda/utils/objectGridSkeletonProps.js";
import Skeleton from "primevue/skeleton";

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
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
        <Skeleton v-bind="getSkeletonPropsForField(field)" />
    </div>
</template>
