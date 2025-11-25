<script setup>
import { deepUnref, keyDiff } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FilterComponent from "@vueda/components/FilterComponent.vue";
import { useFilter } from "@vueda/use/useFilter.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { ListFilterError } from "@vueda/utils/errors.js";
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
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    view: {
        type: String,
        required: true,
    },
    filterables: {
        type: Array,
        description: "A list of the filterables to show in the filter form.",
        default: null,
    },
    filterableDetails: {
        type: Object,
        description: "A dictionary of overriding filterable details.",
        default: null,
    },
    filterFormsValues: {
        type: Object,
        default: () => ({}),
    },
    errored: {
        type: Boolean,
        default: false,
    },
    error: {
        type: Object,
        default: null,
    },
});
const emit = defineEmits(["filter-change", "hide-filter-form", "query-change"]);
const addedFilters = ref([]);
const filterContext = useFilter(props);
const clearFilters = () => {
    addedFilters.value = [];
};
const route = useRoute();

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
// Filter out invalid filterables to prevent rendering broken filter components
const validFilterables = computed(() => {
    const filterables = deepUnref(filterContext?.filterables) || [];
    const filterableDetails = filterContext?.filterableDetails || {};

    return filterables.filter((fieldName) => {
        const detail = filterableDetails[fieldName];
        return detail && detail.typeFilter;
    });
});

// watch computedFilters, and maintain a map to useSlotNameResolver instances
const slots = useSlots();
const resolversEffectScope = effectScope();
const resolvers = reactive({});
watch(
    validFilterables,
    (filters) => {
        const newFilters = deepUnref(filters);
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

const filterError = computed(() => {
    if (props.error && props.error instanceof ListFilterError) {
        return props.error;
    }
    return null;
});

const isFilterErrored = computed(() => {
    return filterError.value && props.errored;
});

const theme = useTheme("FilterGroup", props);
</script>

<template>
    <div :class="theme('root')">
        <div :class="theme('filtersWrapper')">
            <template v-for="(filter, index) in validFilterables" :key="index">
                <slot
                    v-if="resolvers[filter]"
                    :filter="filter"
                    :filter-details="filterContext?.filterableDetails[filter]"
                    :index="index"
                    :model-value="addedFilters"
                    :name="resolvers[filter]?.name"
                    @hide-filter-form="emit('hide-filter-form', $event)"
                >
                    <filter-component
                        :filter-details="filterContext?.filterableDetails[filter] ?? {}"
                        :filter-form-values="filterFormsValues[filter]"
                        :filter-name="filter"
                        :errored="filterError?.erroredFilters?.includes(filter)"
                        :index="index"
                        :params="params"
                        :query="route.query"
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
                :severity="!!addedFilters?.length ? 'warn' : 'secondary'"
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
        <div :class="theme('messageWrapper')">
            <error-display :error="filterError" :errored="isFilterErrored" :ignore-list-filter-errors="true">
                <slot name="filter-group-error-display">
                    <div>
                        {{ error.message }}
                        <ul>
                            <li v-for="(value, key) in error.errorDetails" :key="key">
                                <strong>{{ filterContext?.filterableDetails?.[key]?.label ?? key }}</strong
                                >: {{ value.join(", ") }}
                            </li>
                        </ul>
                    </div>
                </slot>
            </error-display>
        </div>
    </div>
</template>
