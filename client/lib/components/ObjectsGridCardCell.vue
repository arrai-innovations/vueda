<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
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

const theme = useTheme("ObjectsGridCardCell", props);
const { formattedComputed, valueComputed } = useObjectGridCell(props);
const uniqueKeyForSlot = computed(() =>
    props.field.name && props.obj?.[props.pkKey]
        ? `${props.field.name}-${props.obj?.[props.pkKey]}`
        : `col-${props.colIndex}-row-${props.rowIndex}`,
);
</script>
<template>
    <div :class="combineClasses(theme('root'), $attrs.class)" data-qa="objects-grid-card-cell" role="cell">
        <slot
            :key="uniqueKeyForSlot"
            :class="theme('header')"
            :col-index="colIndex"
            :field="field"
            gird-type="cell"
            :is-card-layout="true"
            name="header"
        >
            <div :class="theme('header')" :data-card-header="field.name">
                {{ field.label }}
            </div>
        </slot>
        <div :class="theme('value')" :data-card="field.name">
            <slot
                :key="uniqueKeyForSlot"
                :calculated-obj="calculatedObject"
                :col-index="colIndex"
                :field="field"
                :formatted="formattedComputed"
                :is-card-layout="true"
                name="value"
                :obj="obj"
                :pk="obj?.[pkKey]"
                :pk-key="pkKey"
                :related-obj="relatedObject"
                :row-index="rowIndex"
                :value="valueComputed"
                v-bind="fieldProps"
                >{{ formattedComputed }}</slot
            >
        </div>
    </div>
</template>
