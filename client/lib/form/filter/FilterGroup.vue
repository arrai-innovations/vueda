<script setup>
import Button from "@vueda/controls/button/Button.vue";
import ErrorDisplay from "@vueda/display/error-display/ErrorDisplay.vue";
import FilterChip from "@vueda/form/filter/FilterChip.vue";
import FilterMenu from "@vueda/form/filter/FilterMenu.vue";
import "@vueda/theme/vueda-tailwind/form/FilterGroup.theme.js";
import { useFilter } from "@vueda/use/useFilter.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { ListFilterError } from "@vueda/utils/errors.js";
import { computed, useSlots } from "vue";
import { useRoute } from "vue-router";

/**
 * Presentation host for a model list view's filter controls. It renders the
 * add-filter {@api vue:component:FilterMenu} (whose trigger teleports into the
 * toolbar) from the caller-resolved `filterables` / `filterableDetails` /
 * `validFilterables` and, when filters are active, a strip of removable
 * {@api vue:component:FilterChip}s plus a Clear filters control. Resolving
 * which fields are filterable (typically via
 * {@api js:function:@arrai-innovations/vueda/use/useViewList#useViewList}),
 * restoring the active-filter list from the URL, mirroring it to query
 * parameters, and persisting it as a preference are all the caller's
 * responsibility; this component only renders the `v-model` list and threads
 * add/edit/remove edits back through it.
 *
 * @vueda-slot-forward FilterFieldForm
 */
defineOptions({});

/** The active-filter list; the source of truth for both the chips and menu. Owned by the caller. */
const addedFilters = defineModel({
    type: Array,
    required: true,
});

const props = defineProps({
    ...THEME_OVERRIDE_PROPS,
    /**
     * Django app label. Not used to discover filterable fields (see `filterables` below);
     * used for field/widget component override resolution and passed to descendants
     * (e.g. `FilterFieldForm`) for choice-value fetching.
     */
    app: {
        type: String,
        required: true,
    },
    /** Django model name. See `app` above for what this is (and isn't) used for. */
    model: {
        type: String,
        required: true,
    },
    /** View name, forwarded the same way as `app`/`model`. */
    view: {
        type: String,
        required: true,
    },
    /**
     * Resolved filterable field names for this app/model/view (e.g. `useViewList`'s
     * `filter.filterables`), including fields with no usable filter type or that are
     * server-hidden. `FilterGroup` does not fetch, merge, or recompute this itself.
     */
    filterables: {
        type: Array,
        required: true,
    },
    /** Resolved per-field filter details (e.g. `useViewList`'s `filter.filterableDetails`). */
    filterableDetails: {
        type: Object,
        required: true,
    },
    /**
     * `filterables` narrowed to non-hidden fields the client can render an editable input for
     * (e.g. `useViewList`'s `filter.validFilterables`); the field list rendered as addable/editable.
     */
    validFilterables: {
        type: Array,
        required: true,
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
     * When true, the chips render as a bare subgroup (no band chrome) for
     * hosting inside a shared {@api vue:component:ConstraintsBar}; the group
     * keeps its own Clear filters control. When false (default), the chips
     * render as a self-contained strip.
     */
    hosted: {
        type: Boolean,
        default: false,
    },
});
const emit = defineEmits([
    /** Forwarded from the add-filter menu or a filter chip's edit popover when it should close. */
    "hide-filter-form",
]);

// Only used for field/widget component resolution and the FilterModelSymbol provide that
// FilterFieldForm/FilterChip inject; `filterables`/`filterableDetails` themselves are the
// props above, never recomputed here.
useFilter(props);
const route = useRoute();

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
            :filterable-details="filterableDetails"
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
                :filter-details="filterableDetails?.[filter.field] ?? {}"
                :query="route.query"
                :errored="erroredFields.includes(filter.field)"
                @hide-filter-form="emit('hide-filter-form', $event)"
            >
                <template v-for="(_, slot) in slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </filter-chip>
            <!-- Bulk clear only earns its place with more than one filter; a lone chip is removed by its own x. -->
            <Button
                v-if="addedFilters.length > 1"
                emphasis="outline"
                size="sm"
                :class="theme('clear')"
                data-qa="filter-clear"
                @click="clearFilters"
            >
                Clear filters
            </Button>
        </div>
        <div v-if="isFilterErrored" :class="theme('messageWrapper')">
            <error-display :error="filterError" :errored="isFilterErrored" :ignore-list-filter-errors="true">
                <slot name="filter-group-error-display">
                    <div>
                        {{ error.message }}
                        <ul>
                            <li v-for="(value, key) in error.errorDetails" :key="key">
                                <strong>{{ filterableDetails?.[key]?.label ?? key }}</strong
                                >: {{ value.join(", ") }}
                            </li>
                        </ul>
                    </div>
                </slot>
            </error-display>
        </div>
    </div>
</template>
