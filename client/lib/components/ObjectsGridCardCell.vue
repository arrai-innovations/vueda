<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { useObjectGridCell } from "@vueda/use/useObjectGridCell.js";

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
});

const theme = useComputedClasses(vuedaTailwind.ObjectsGridCardCell, props);
const { formattedComputed, valueComputed } = useObjectGridCell(props);
</script>
<template>
    <div :class="[theme('root'), $attrs.class]" data-qa="objects-grid-card-cell" role="cell">
        <slot :class="theme('header')" :col-index="colIndex" :field="field" name="header">
            <div :class="theme('header')" :data-card-header="field.name">
                {{ field.label }}
            </div>
        </slot>
        <div :class="theme('value')" :data-card="field.name">
            <slot
                :calculated-obj="calculatedObject"
                :col-index="colIndex"
                :field="field"
                :formatted="formattedComputed"
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
