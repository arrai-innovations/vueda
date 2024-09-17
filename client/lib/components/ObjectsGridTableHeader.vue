<script setup>
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";

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
});

const theme = useComputedClasses(vuedaTailwind.ObjectsGridTableHeader, props);
</script>
<template>
    <div :class="theme('root')">
        <span :class="theme('label')">{{ field.label }}</span>
        <span v-if="sortable" :class="theme('sortIcon')">
            <slot
                :ascending="ascending"
                :col-index="colIndex"
                :descending="descending"
                :field="field"
                name="sort-icon"
                v-bind="fieldProps"
            >
                <!-- iconless text, screams to implementors to provide an icon -->
                <template v-if="ascending">⬆️</template>
                <template v-else-if="descending">⬇️</template>
                <template v-else>↕️</template>
            </slot>
            <span v-if="multiSortIndex !== undefined" :class="theme('multiSortNumber')">
                {{ multiSortIndex + 1 }}
            </span>
        </span>
    </div>
</template>
