<script setup>
import { useObjectGridCell } from "@vueda/use/useObjectGridCell.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed } from "vue";

const props = defineProps({
    field: {
        type: Object,
        required: true,
        description: "The field definition, we use name, label, value, and formatted",
    },
    obj: {
        type: Object,
        required: true,
    },
    relatedObject: {
        type: Object,
        required: true,
    },
    calculatedObject: {
        type: Object,
        required: true,
    },
    rowIndex: {
        type: Number,
        required: true,
    },
    colIndex: {
        type: Number,
        required: true,
    },
    fieldProps: {
        type: Object,
        default: () => ({}),
        description: "Props to pass to the field slots",
    },
    pkKey: {
        type: String,
        default: "id",
    },
    pk: {
        type: [String, Number],
        default: undefined,
    },
    ...THEME_OVERRIDE_PROPS,
});

const theme = useTheme("ObjectsGridBodyCell", props);
const { formattedComputed, valueComputed } = useObjectGridCell(props);
const uniqueKeyForSlot = computed(() =>
    props.field.name && props.obj?.[props.pkKey]
        ? `${props.field.name}-${props.obj?.[props.pkKey]}`
        : `col-${props.colIndex}-row-${props.rowIndex}`,
);
</script>
<template>
    <div :class="[theme('root'), $attrs.class]">
        <slot
            :key="uniqueKeyForSlot"
            :calculated-obj="calculatedObject"
            :col-index="colIndex"
            :field="field"
            :formatted="formattedComputed"
            :is-card-layout="false"
            name="value"
            :obj="obj"
            :pk="obj?.[pkKey]"
            :pk-key="pkKey"
            :related-obj="relatedObject"
            :row-index="rowIndex"
            :value="valueComputed"
            v-bind="fieldProps"
        >
            {{ formattedComputed }}
        </slot>
    </div>
</template>
