<script setup>
import { deepUnref } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FilterChip from "@vueda/components/FilterChip.vue";
import FilterMenu from "@vueda/components/FilterMenu.vue";
import Button from "@vueda/controls/button/Button.vue";
import "@vueda/theme/vueda-tailwind/form/FilterGroup.theme.js";
import { useFilter } from "@vueda/use/useFilter.js";
import { buildFilterFromQuery } from "@vueda/use/useFilterForm.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { ListFilterError } from "@vueda/utils/errors.js";
import isEqual from "lodash-es/isEqual.js";
import isObject from "lodash-es/isObject.js";
import { computed, ref, useSlots, watch } from "vue";
import { useRoute } from "vue-router";

/**
 * Filter orchestrator for a model list view. It fetches the available
 * filterable fields from server configuration, renders the add-filter
 * {@api vue:component:FilterMenu} (whose trigger teleports into the toolbar) and,
 * when filters are active, a strip of removable {@api vue:component:FilterChip}s
 * plus a Clear all control. It owns the active-filter list, mirrors it to the
 * `v-model` query params, and restores active filters from the URL on load.
 *
 * @vueda-slot-forward FilterFieldForm
 */
defineOptions({});

const params = defineModel({
    type: Object,
    required: true,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /** Django app label used to fetch the filter configuration from the server. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name used to fetch the filter configuration from the server. */
    model: {
        type: String,
        required: true,
    },
    /** View name used to fetch the filter configuration from the server. */
    view: {
        type: String,
        required: true,
    },
    /** List of field names to show as filters; overrides the server-provided list when set. */
    filterables: {
        type: Array,
        default: null,
    },
    /** Per-field filter detail overrides merged with server-provided configuration. */
    filterableDetails: {
        type: Object,
        default: null,
    },
    /** When true, the filter group is in an error state, enabling error display. */
    errored: {
        type: Boolean,
        default: false,
    },
    /** Error object to display; only rendered when it is a `ListFilterError` instance. */
    error: {
        type: Object,
        default: null,
    },
    /** Element (or selector) in the host toolbar that the add-filter trigger teleports into. */
    triggerTarget: {
        type: [Object, String],
        default: null,
    },
    /**
     * When true, the chips render as a bare subgroup (no band chrome, no own
     * Clear all) for hosting inside a shared {@api vue:component:ConstraintsBar}.
     * When false (default), the chips render as a self-contained strip.
     */
    hosted: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits(["filter-change", "hide-filter-form", "query-change"]);

const filterContext = useFilter(props);
const route = useRoute();

/** Active filters, the source of truth for both the chips and the query params. */
const addedFilters = ref([]);

// Filterables that resolved to a usable filter type; everything else is skipped.
// Server-hidden filters (e.g. the auto-injected `id__in` deep-link filter, whose
// widget is a HiddenInput) are excluded: they are programmatic, not user-entered,
// and have no mapped input widget, so they must not appear in the add-filter menu
// or render as editable chips.
const validFilterables = computed(() => {
    const filterables = deepUnref(filterContext?.filterables) || [];
    const filterableDetails = filterContext?.filterableDetails || {};
    return filterables.filter((fieldName) => {
        const detail = filterableDetails[fieldName];
        return detail && detail.typeFilter && !detail.hidden;
    });
});

// Reduce an active-filter list to the flat query-param object the URL carries.
// Shared by the apply watch (addedFilters -> params) and the restoration guard
// (so a round-trip through the URL does not clobber rich in-memory values).
const filtersToParams = (filters) => {
    const desiredParams = {};
    for (const filter of filters) {
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
    return desiredParams;
};

watch(
    addedFilters,
    (newAddedFilters) => {
        const desiredParams = filtersToParams(newAddedFilters);
        if (!isEqual(desiredParams, params.value)) {
            params.value = desiredParams;
            emit("filter-change", newAddedFilters);
        }
    },
    { deep: true },
);

// Notify the host (useViewList) when the route query changes externally.
watch(
    () => route.query,
    (newQuery) => {
        if (!isEqual(newQuery, params.value)) {
            emit("query-change", newQuery);
        }
    },
    { immediate: true },
);

// Rebuild the active-filter list (and thus the chips) from the URL on load and
// whenever the query changes externally. Guarded so our own applied filters,
// which carry richer values than the URL, are not flattened back into the URL form.
const restoreFromQuery = () => {
    const details = filterContext?.filterableDetails || {};
    const restored = (validFilterables.value || [])
        .map((field) => buildFilterFromQuery(field, details[field], route.query))
        .filter(Boolean);
    if (!isEqual(filtersToParams(restored), filtersToParams(addedFilters.value))) {
        addedFilters.value = restored;
    }
};
watch([() => route.query, validFilterables, () => filterContext?.filterableDetails], restoreFromQuery, {
    immediate: true,
    deep: true,
});

const clearFilters = () => {
    addedFilters.value = [];
};

const filterError = computed(() => {
    if (props.error && props.error instanceof ListFilterError) {
        return props.error;
    }
    return null;
});
const isFilterErrored = computed(() => filterError.value && props.errored);
const erroredFields = computed(() => filterError.value?.erroredFilters ?? []);

const theme = useTheme("FilterGroup", props);
const slots = useSlots();

defineExpose({ addedFilters });
</script>

<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value">
        <filter-menu
            v-model="addedFilters"
            :filterables="validFilterables"
            :filterable-details="filterContext?.filterableDetails ?? {}"
            :query="route.query"
            :trigger-target="triggerTarget"
            @hide-filter-form="emit('hide-filter-form', $event)"
        >
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </filter-menu>
        <div
            v-if="addedFilters.length"
            :class="hosted ? theme('subgroup') : theme('strip')"
            data-qa="filter-group-strip"
        >
            <span :class="theme('eyebrow')">Filters</span>
            <filter-chip
                v-for="filter in addedFilters"
                :key="filter.field"
                v-model="addedFilters"
                :filter="filter"
                :filter-details="filterContext?.filterableDetails?.[filter.field] ?? {}"
                :query="route.query"
                :errored="erroredFields.includes(filter.field)"
                @hide-filter-form="emit('hide-filter-form', $event)"
            >
                <template v-for="(_, slot) in slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </filter-chip>
            <Button
                v-if="!hosted"
                variant="ghost"
                size="sm"
                :class="theme('clear')"
                data-qa="filter-clear"
                @click="clearFilters"
            >
                Clear all
            </Button>
        </div>
        <div v-if="isFilterErrored" :class="theme('messageWrapper')">
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
