<script setup>
import FilterComponent from "@vueda/components/FilterComponent.vue";
import { isObject } from "lodash-es";
import isArray from "lodash-es/isArray.js";
import isEqual from "lodash-es/isEqual.js";
import Button from "primevue/button";
import { computed, ref, watch } from "vue";

const listArgs = defineModel({
    type: Object,
    required: true,
});

const props = defineProps({
    filterables: {
        type: Array,
        required: true,
        description: "A list of the filterables to show in the filter form.",
    },
    filterableDetails: {
        type: Object,
        required: true,
        description: "A dictionary of overriding filterable details.",
    },
});
const emit = defineEmits(["clear-filters", "remove-filter"]);
const addedFilters = ref([]);

const clearFilters = () => {
    addedFilters.value = [];
    emit("clear-filters");
};

const computedFilters = computed(() => props.filterables.filter((filter) => props.filterableDetails[filter]));
watch(
    addedFilters,
    (newAddedFilters) => {
        const desiredListArgs = {};
        for (const filter of newAddedFilters) {
            if (isArray(filter.param)) {
                filter.param.forEach((p) => {
                    if (isObject(filter.value)) {
                        desiredListArgs[p] = filter.value[p] ?? "";
                    } else {
                        desiredListArgs[p] = filter.value;
                    }
                });
                continue;
            }
            desiredListArgs[`${filter.param}`] = filter.value;
        }
        if (!isEqual(desiredListArgs, listArgs.value)) {
            listArgs.value = desiredListArgs;
        }
    },
    {
        deep: true,
    },
);
</script>

<template>
    <div class="flex flex-wrap gap-1 mt-1">
        <template v-for="(filter, index) in computedFilters" :key="index">
            <filter-component
                :filter-details="props.filterableDetails[filter]"
                :filter-name="filter"
                :index="index"
                :model-value="addedFilters"
                @remove-filter="emit('remove-filter', $event)"
            >
                <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </filter-component>
        </template>
        <Button label="Clear Filters" rounded size="small" variant="text" @click="clearFilters" />
    </div>
</template>
