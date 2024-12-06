<script setup>
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import FilterComponent from "@vueda/components/FilterComponent.vue";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { isObject } from "lodash-es";
import isArray from "lodash-es/isArray.js";
import isEqual from "lodash-es/isEqual.js";
import Button from "primevue/button";
import { computed, readonly, ref, watch } from "vue";
import { useRoute } from "vue-router";

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
const emit = defineEmits(["filter-change", "hide-filter-form"]);
const addedFilters = ref([]);

const clearFilters = () => {
    addedFilters.value = [];
};
const route = useRoute();
const computedFilters = computed(() => props.filterables.filter((filter) => props.filterableDetails[filter]));

watch(
    () => route.query, // Watch the query part of the route
    (newQuery) => {
        console.log("newQuery", newQuery);
        if (!isEqual(newQuery, listArgs.value)) {
            assignReactiveObject(listArgs, newQuery);
            // const listArgsAsList = Object.entries(listArgs.value).map(([key, value]) => ({ field: key, value }));
            // emit("filter-change", listArgsAsList);
            // TODO: sync addedFilters with listArgs
        }
        console.log("listArgs.value", listArgs.value);
    },
    { immediate: true }, // Run immediately on component mount
);

watch(
    addedFilters,
    (newAddedFilters) => {
        const desiredListArgs = {};
        for (const filter of newAddedFilters) {
            let filterValue = filter.value;
            if (filter.isValueRawObject) {
                isArray(filterValue)
                    ? (filterValue = filterValue.map((value) => value.value))
                    : (filterValue = filterValue.value);
            }
            if (isArray(filter.param)) {
                filter.param.forEach((p) => {
                    if (isObject(filter.value)) {
                        const parts = p.split("_");
                        const key = parts[parts.length - 1];
                        desiredListArgs[p] = filterValue[key] ?? "";
                    } else {
                        desiredListArgs[p] = filterValue;
                    }
                });
                continue;
            } else {
                desiredListArgs[`${filter.param}`] = filterValue;
            }
        }
        if (!isEqual(desiredListArgs, listArgs.value)) {
            listArgs.value = desiredListArgs;
            emit("filter-change", readonly(newAddedFilters));
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
            <slot
                :filter="filter"
                :filter-details="props.filterableDetails[filter]"
                :index="index"
                :model-value="addedFilters"
                :name="useSlotNameResolver([`filter-component(${filter})`, 'filter-component'])"
                @hide-filter-form="emit('hide-filter-form', $event)"
            >
                <filter-component
                    :filter-details="props.filterableDetails[filter]"
                    :filter-name="filter"
                    :index="index"
                    :list-args="listArgs"
                    :model-value="addedFilters"
                    @hide-filter-form="emit('hide-filter-form', $event)"
                >
                    <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps || {}" />
                    </template>
                </filter-component>
            </slot>
        </template>
        <slot
            :has-filters="!!addedFilters?.length"
            label="Clear Filters"
            name="clear-filters-button"
            verb="clearFilters"
            @click="clearFilters"
        >
            <Button
                label="Clear Filters"
                name="clear-filters-button"
                :severity="!!addedFilters?.length ? 'warn' : 'secondary'"
                @click="clearFilters"
            />
        </slot>
    </div>
</template>
