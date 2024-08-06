<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { unifiedGet } from "@vueda/utils/unifiedGet.js";
import { computed } from "vue";

const props = defineProps({
    field: {
        type: Object,
        required: true,
        description: "The field definition, we use name, label, and formatted",
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
});

const theme = useComputedClasses(vuedaTailwind.ObjectsGridBodyCell, props);
const formattedComputed = computed(() => {
    return unifiedGet(
        props.obj,
        props.relatedObject,
        props.calculatedObject,
        props.field.formatted ?? props.field.name,
    );
});
const valueComputed = computed(() => {
    return unifiedGet(props.obj, props.relatedObject, props.calculatedObject, props.field.name);
});
</script>
<template>
    <div :class="theme('root')">
        <slot
            :calculated-obj="calculatedObject"
            :class="theme('value')"
            :col-index="colIndex"
            :field="field"
            :formatted="formattedComputed"
            name="value"
            :obj="obj"
            :related-obj="relatedObject"
            :row-index="rowIndex"
            :value="valueComputed"
        >
            <p :class="theme('value')">{{ formattedComputed }}</p>
        </slot>
    </div>
</template>
