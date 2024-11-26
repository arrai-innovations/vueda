<script setup>
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

const props = defineProps({
    field: {
        type: Object,
        required: true,
        description: "The field definition, we use name and label",
    },
    colIndex: {
        type: Number,
        required: true,
    },
    sortable: {
        type: Boolean,
        default: false,
    },
    ascending: {
        type: Boolean,
        default: false,
    },
    descending: {
        type: Boolean,
        default: false,
    },
    multiSortIndex: {
        type: Number,
        default: undefined,
    },
    fieldProps: {
        type: Object,
        default: () => ({}),
        description: "Props to pass to the field slots",
    },
    ...THEME_OVERRIDE_PROPS,
});

const theme = useTheme("ObjectsGridTableHeader", props);
const uniqueKeyForSlot = computed(() =>
    props.field.name ? `${props.field.name}-${props.colIndex}` : `col-${props.colIndex}`,
);
</script>
<template>
    <div :class="theme('root')">
        <span :class="theme('label')">
            <slot
                :key="uniqueKeyForSlot"
                :col-index="colIndex"
                :field="field"
                v-bind="fieldProps"
                gird-type="table-header"
                :is-card-layout="false"
                name="label"
            >
                {{ field.label }}
            </slot>
        </span>
        <span v-if="sortable" :class="theme('sortIcon')">
            <slot
                :key="uniqueKeyForSlot"
                :ascending="ascending"
                :col-index="colIndex"
                :descending="descending"
                :field="field"
                :is-card-layout="false"
                name="sort-icon"
                v-bind="fieldProps"
            >
                <!-- iconless text, screams to implementors to provide an icon -->
                <template v-if="ascending">⬆️</template>
                <template v-else-if="descending">⬇️</template>
                <template v-else>↕️</template>
            </slot>
            <span v-if="multiSortIndex !== -1" :class="theme('multiSortNumber')">
                {{ multiSortIndex + 1 }}
            </span>
        </span>
    </div>
</template>
