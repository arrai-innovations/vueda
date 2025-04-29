<script setup>
import { keyDiff } from "@arrai-innovations/reactive-helpers";
import FilterComponent from "@vueda/components/FilterComponent.vue";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import isEqual from "lodash-es/isEqual.js";
import isObject from "lodash-es/isObject.js";
import Button from "primevue/button";
import { computed, effectScope, reactive, readonly, ref, useSlots, watch } from "vue";
import { useRoute } from "vue-router";

const params = defineModel({
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
    filterFormsValues: {
        type: Object,
        default: () => ({}),
    },
});
const emit = defineEmits(["filter-change", "hide-filter-form", "query-change"]);
const addedFilters = ref([]);

const clearFilters = () => {
    addedFilters.value = [];
};
const route = useRoute();
const computedFilters = computed(() => props.filterables.filter((filter) => props.filterableDetails[filter]));

watch(
    () => route.query, // Watch the query part of the route
    (newQuery) => {
        if (!isEqual(newQuery, params.value)) {
            emit("query-change", newQuery);
        }
    },
    { immediate: true }, // Run immediately on component mount
);

watch(
    addedFilters,
    (newAddedFilters) => {
        const desiredParams = {};
        for (const filter of newAddedFilters) {
            let filterValue = filter.value;
            if (filter.isValueRawObject) {
                Array.isArray(filterValue)
                    ? (filterValue = filterValue.map((value) => value.value))
                    : (filterValue = filterValue.value);
            }
            if (Array.isArray(filter.param)) {
                filter.param.forEach((p) => {
                    if (isObject(filter.value)) {
                        const parts = p.split("_");
                        const key = parts[parts.length - 1];
                        desiredParams[p] = filterValue[key] ?? "";
                    } else {
                        desiredParams[p] = filterValue;
                    }
                });
            } else {
                desiredParams[`${filter.param}`] = filterValue;
            }
        }
        if (!isEqual(desiredParams, params.value)) {
            params.value = desiredParams;
            emit("filter-change", readonly(newAddedFilters));
        }
    },
    {
        deep: true,
    },
);
// watch computedFilters, and maintain a map to useSlotNameResolver instances
const slots = useSlots();
const resolversEffectScope = effectScope();
const resolvers = reactive({});
watch(
    computedFilters,
    (newFilters) => {
        const { addedKeys, removedKeys } = keyDiff(newFilters, Object.keys(resolvers));
        for (const key of addedKeys) {
            resolversEffectScope.run(() => {
                resolvers[key] = useSlotNameResolver([`filter-component(${key})`, "filter-component"], slots);
            });
        }
        for (const key of removedKeys) {
            resolvers[key].stop();
            delete resolvers[key];
        }
    },
    { immediate: true, deep: true },
);
</script>

<template>
    <div class="flex flex-wrap gap-1 mt-1">
        <template v-for="(filter, index) in computedFilters" :key="index">
            <slot
                v-if="resolvers[filter]"
                :filter="filter"
                :filter-details="props.filterableDetails[filter]"
                :index="index"
                :model-value="addedFilters"
                :name="resolvers[filter]?.name"
                @hide-filter-form="emit('hide-filter-form', $event)"
            >
                <filter-component
                    :filter-details="props.filterableDetails[filter]"
                    :filter-form-values="filterFormsValues[filter]"
                    :filter-name="filter"
                    :index="index"
                    :params="params"
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
