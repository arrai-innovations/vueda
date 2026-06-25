<script setup>
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FilterGroup from "@vueda/components/FilterGroup.vue";
import FormMessage from "@vueda/components/FormMessage.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import ObjectsGridBodyCell from "@vueda/components/ObjectsGridBodyCell.vue";
import PageActions from "@vueda/components/PageActions.vue";
import PaginationComponent from "@vueda/components/PaginationComponent.vue";
import SortControl from "@vueda/components/SortControl.vue";
import StickyChrome from "@vueda/components/StickyChrome.vue";
import Checkbox from "@vueda/controls/checkbox/Checkbox.vue";
import InputGroup from "@vueda/controls/input-group/InputGroup.vue";
import InputGroupButton from "@vueda/controls/input-group/InputGroupButton.vue";
import InputGroupInput from "@vueda/controls/input-group/InputGroupInput.vue";
import Select from "@vueda/controls/select/Select.vue";
import SelectContent from "@vueda/controls/select/SelectContent.vue";
import SelectItem from "@vueda/controls/select/SelectItem.vue";
import SelectTrigger from "@vueda/controls/select/SelectTrigger.vue";
import SelectValue from "@vueda/controls/select/SelectValue.vue";
import "@vueda/theme/vueda-tailwind/views/ViewList.theme.js";
import { usePageTitle } from "@vueda/use/usePageTitle.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useViewList } from "@vueda/use/useViewList.js";
import { getCRUDName } from "@vueda/utils/case.js";
import omit from "lodash-es/omit.js";
import { computed, onMounted, reactive, readonly, ref, toRef, toRefs, useSlots } from "vue";

/**
 * Full-page list view for a Django model. Renders a paginated, sortable, and searchable data grid with support
 * for column hiding, filter groups, bulk actions, targetless actions, workflow transitions, column totals, and
 * switching between paginated and show-all display. Persists sort order, visible columns, and active filters
 * across page visits via the list preference store.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    /** Django app label that owns the model. */
    app: {
        type: String,
        required: true,
    },
    /** Django model name used to resolve API endpoints and configuration. */
    model: {
        type: String,
        required: true,
    },
    /** Field names to include as list columns; uses the model config default when empty. */
    listFields: {
        type: Array,
        default: () => [],
    },
    /** Map of field names to display configuration overrides (label, component, etc.). */
    displayFields: {
        type: Object,
        default: () => ({}),
    },
    /**
     * Per-field list column adapter overrides. Each value is a component, a
     * `() => component` loader, or a string key into `availableColumns`. Takes
     * precedence over `modelConfig.config.columnComponents` and type defaults;
     * a consumer `#field(<col>)` slot still wins over both.
     */
    columnComponents: {
        type: Object,
        default: () => ({}),
    },
    /** Per-field props forwarded to the resolved list column adapter. */
    columnProps: {
        type: Object,
        default: () => ({}),
    },
    /** Rules mapping related object keys to fetch data alongside each list row. */
    relatedObjectsRules: {
        type: Object,
        default: () => ({}),
    },
    /** Rules mapping calculated object keys to derive computed data alongside each list row. */
    calculatedObjectsRules: {
        type: Object,
        default: () => ({}),
    },
    /** Additional query parameters merged into every API request. */
    params: {
        type: Object,
        default: () => ({}),
    },
    // as long as there are no collisions, $attrs can be used to pass through any other props to objects-grid
    /** Tailwind breakpoint at which the layout switches from card to table view. */
    tableBreakpoint: {
        type: String,
        default: "lg",
    },
    /** Extra synthetic field objects appended to the field list (e.g. the `selected_` checkbox column). */
    extraFieldObjects: {
        type: Array,
        default: () => [
            {
                name: `selected_`,
                extra: true,
                label: "Selected",
            },
        ],
    },
    /** List of field names to show as filters; overrides the server-provided list when set. */
    filterables: {
        type: Array,
        default: undefined,
    },
    /** Per-field filter detail overrides merged with server-provided configuration. */
    filterableDetails: {
        type: Object,
        default: () => ({}),
    },
    /** When true, shows a control that lets the user load all pages at once. */
    allowShowAllPages: {
        type: Boolean,
        default: true,
    },
    /** When true, always fetches and displays all pages without requiring user interaction. */
    alwaysShowAllPages: {
        type: Boolean,
        default: false,
    },
    /** When true, displays the total record count in the pagination bar. */
    showTotalRecordNum: {
        type: Boolean,
        default: true,
    },
    /** When true, shows a column-visibility selector so users can hide individual columns. */
    allowColumnHiding: {
        type: Boolean,
        default: false,
    },
    ...THEME_OVERRIDE_PROPS,
});

const { modelConfig, list, actions, search, sort, columns, pagination } = useViewList(props);

// Contribute the page title and loading state to the layout's PageTitle display.
usePageTitle(() => ({ title: list.titleStr, loading: list.instanceList.state.loading }));

const slots = useSlots();

// Teleport target in the under-actions bar that the FilterGroup's add-filter
// trigger teleports into, so the trigger sits in the toolbar while its popover
// state stays owned by FilterGroup.
const filterTriggerZone = ref(null);

const targetlessActionButtonSlotName = useSlotNameResolver(["targetless-action-button", "button"]);
const bulkActionButtonSlotName = useSlotNameResolver(["bulk-action-button", "button"]);
const workflowActionButtonSlotName = useSlotNameResolver(["workflow-action-button", "button"]);

const themeOverride = computed(() => props.themeOverride?.["ViewList"]);
const theme = useTheme(
    "ViewList",
    props,
    reactive({
        ...toRefs(props),
        loading: computed(() => list.loading),
        errored: computed(() => list.errored),
        error: computed(() => list.error),
    }),
);

// Restore theme classes on slot props so slot consumers can spread them and get the correct class.
const themedButtonSlotProps = computed(() => {
    const result = {};
    for (const [key, value] of Object.entries(actions.buttonSlotProps)) {
        const isBulk = actions.bulkActions.has(key) || actions.availableTransitions.has(key);
        result[key] = { ...value, class: isBulk ? theme("bulkActionButton") : theme("targetlessActionButton") };
    }
    return result;
});

const themedSearchSlotProps = computed(() => ({
    ...search.searchSlotProps,
    searchInputClass: theme("searchInput"),
}));

const emit = defineEmits([
    "selected",
    "sorted",
    "objects",
    "order",
    "loading",
    "related-objects",
    "calculated-objects",
    "filter-change",
    "query-change",
    "hide-filter-form",
]);
onMounted(() => {
    emit(
        "objects",
        toRef(() => list.instanceList.state.objects),
    );
    emit(
        "order",
        toRef(() => list.instanceList.state.order),
    );
    emit(
        "sorted",
        toRef(() => sort.sorting.state.sorted),
    );
    emit("selected", readonly(toRef(actions, "selectedObjects")));
    emit("loading", list.loading);
    emit("related-objects", readonly(list.instanceList.state.relatedObjects));
    emit("calculated-objects", readonly(list.instanceList.state.calculatedObjects));
});
</script>
<template>
    <div :style="theme.hideStyle?.value">
        <!-- Targetless (list-level) actions teleport into the layout's PageTitle action zone. -->
        <page-actions>
            <slot name="targetless-action-buttons" :targetless-actions="actions.targetlessActions">
                <template
                    v-for="actionName in actions.targetlessActions"
                    :key="getCRUDName({ app: app, model: model, view: actionName })"
                >
                    <!-- @slot [targetless-action-button, button] Replaces an individual targetless action button. -->
                    <slot :name="targetlessActionButtonSlotName.name" v-bind="themedButtonSlotProps[actionName]">
                        <link-model-view v-bind="themedButtonSlotProps[actionName]" />
                    </slot>
                </template>
            </slot>
        </page-actions>
        <!-- Under-actions toolbar: teleports into the sticky-stack top zone (reveals on scroll up)
             when a StickyStackProvider is present, otherwise renders inline here. -->
        <sticky-chrome zone="top" reveal="scroll-up">
            <div :class="theme('underActionsBar')" data-qa="view-list-under-actions">
                <div :class="theme('filterControls')" data-qa="view-list-filter-controls">
                    <!-- FilterGroup's add-filter trigger teleports into this zone. -->
                    <div
                        ref="filterTriggerZone"
                        :class="theme('filterTriggerZone')"
                        data-qa="view-list-filter-trigger"
                    />
                    <sort-control
                        v-if="sort.canShowSorter"
                        :field-details="modelConfig.config?.fieldDetails || {}"
                        :sortables="sort.sortablesList"
                        :sorted="sort.sorting.state.sorted"
                        @update:sorted="sort.sorting.updateSorted"
                    >
                        <template v-for="(_, slot) in slots" #[slot]="slotProps">
                            <slot :name="slot" v-bind="slotProps || {}" />
                        </template>
                    </sort-control>
                </div>
                <div :class="theme('listControlBar')">
                    <slot name="search" v-bind="themedSearchSlotProps">
                        <InputGroup>
                            <InputGroupInput
                                :class="theme('searchInput')"
                                :model-value="search.searchSlotProps.listSearch"
                                name="search"
                                placeholder="Search"
                                type="search"
                                @search="search.filterList"
                                @update:model-value="search.searchSlotProps.updateListSearch"
                            />
                            <InputGroupButton @click="search.filterList"> Search </InputGroupButton>
                        </InputGroup>
                    </slot>
                    <slot
                        v-if="modelConfig.config?.allowColumnHiding || allowColumnHiding"
                        name="columns-select"
                        :columns="columns.columns"
                        :options="columns.columnOptions"
                        :loading="list.loading"
                    >
                        <Select v-model="columns.columns" multiple>
                            <SelectTrigger size="sm">
                                <SelectValue>
                                    <slot name="columns-select-value-label">columns</slot>
                                </SelectValue>
                                <template v-if="slots['columns-select-dropdown-icon']" #icon>
                                    <slot name="columns-select-dropdown-icon" />
                                </template>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    v-for="option in columns.columnOptions"
                                    :key="option.value"
                                    :value="option.value"
                                >
                                    {{ option.label }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </slot>
                </div>
            </div>
        </sticky-chrome>
        <!-- FilterGroup teleports its add-filter trigger into the toolbar zone above and renders
             the active-filter chips strip (only when filters are present) in this flow position. -->
        <filter-group
            v-model="list.listState.filterArgs"
            :app="props.app"
            :model="props.model"
            :view="'list'"
            :error="list.instanceList.state.error"
            :errored="list.instanceList.state.errored"
            :filterable-details="props.filterableDetails"
            :filterables="props.filterables"
            :trigger-target="filterTriggerZone"
            @filter-change="emit('filter-change', $event)"
            @hide-filter-form="emit('hide-filter-form', $event)"
            @query-change="emit('query-change', $event)"
        >
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </filter-group>

        <slot name="additional-errors" />
        <error-display :error="list.error" :errored="list.errored" @dismiss-error="list.dismissError" />
        <!-- todo: filters/search -->
        <!-- todo: hide/show columns -->
        <!-- todo: filters return here? @submit=filterList -->
        <slot name="before-list">
            <div class="max-w-full overflow-x-auto p-1 flex flex-col gap-2">
                <form-message type="error" />
                <form-message type="message" />
            </div>
        </slot>
        <objects-grid
            v-bind="$attrs"
            :calculated-objects="list.instanceList.state.calculatedObjects"
            :class="theme('objectsGrid')"
            :field-classes="{
                ...($attrs.fieldClasses || {}),
                selected_: theme('selectedCheckbox'),
            }"
            :field-props="{
                pkKey: modelConfig.info?.pk ?? 'id',
                modelInfo: modelConfig.info,
                modelConfig: modelConfig.config,
            }"
            :fields="list.computedFieldObjects"
            :loading="list.loading"
            :objects-in-order="list.instanceList.state.objectsInOrder"
            :related-objects="list.instanceList.state.relatedObjects"
            :sortables="sort.sorting.state.sortables"
            :sorted="sort.sorting.state.sorted"
            :table-breakpoint="tableBreakpoint"
            :theme-override="themeOverride"
            @update:sorted="sort.sorting.updateSorted"
            @update:is-table="sort.isTable = $event"
        >
            <template
                v-for="slot in Object.keys(slots).filter(
                    (slot) => !list.specialSlots.includes(slot) && !list.columnSlots.includes(slot),
                )"
                #[slot]="slotProps"
            >
                <slot :name="slot" v-bind="slotProps || {}"></slot>
            </template>
            <!-- Type-aware column adapters: inject a default `field(<col>)` per
                 display column. The inner <slot> renders the consumer's own
                 `field(<col>)` slot when provided (highest precedence), else the
                 resolved adapter. Covers both table and card layouts because
                 ObjectsGrid maps `field(<col>)` into both cell types. -->
            <template v-for="(resolved, name) in list.columnComponents" :key="name" #[`field(${name})`]="slotProps">
                <slot :name="`field(${name})`" v-bind="slotProps">
                    <component :is="resolved.component" v-bind="{ ...slotProps, ...resolved.props }" />
                </slot>
            </template>
            <template v-for="field in extraFieldObjects" :key="field.name" #[`header(${field.name})`]="slotProps">
                <slot :name="`field(${field.name})`" v-bind="slotProps">
                    <div :class="slotProps.class" :data-card-header="field.name">
                        {{ slotProps.girdType === "cell" ? field.label : "" }}
                    </div>
                </slot>
            </template>
            <template v-for="field in extraFieldObjects" :key="field.name" #[`field(${field.name})`]="slotProps">
                <slot
                    v-bind="slotProps"
                    :has-selectable-actions="actions.bulkActions.size || actions.availableTransitions.size"
                    :name="`field(${field.name})`"
                >
                    <Checkbox
                        v-if="actions.bulkActions.size || actions.availableTransitions.size"
                        :id="`selected-row-${slotProps.pk}`"
                        :model-value="actions.selectedObjects.includes(slotProps.pk)"
                        name="selected"
                        v-bind="slotProps"
                        @update:model-value="actions.toggleSelectedObject(slotProps.pk)"
                    />
                </slot>
            </template>
            <template #row-after-objects="slotProps">
                <slot name="row-after-objects" v-bind="slotProps" :column-totals="list.columnTotals">
                    <div
                        v-if="sort.isTable && Object.keys(list.columnTotals).length"
                        :class="slotProps.class"
                        role="row"
                    >
                        <objects-grid-body-cell
                            v-for="(field, index) in list.computedFieldObjects"
                            :key="field.name"
                            :field="field"
                            :obj="{}"
                            :related-object="{}"
                            :calculated-object="{}"
                            :row-index="0"
                            :column-index="index"
                            :row-count="1"
                            :column-count="list.computedFieldObjects.length"
                            :pk-key="list.pkKey"
                            :class="theme('columnTotalCell')"
                        >
                            <template #value>
                                <slot :name="`field(${field.name})totals`" :value="list.columnTotals[field.name]">
                                    {{ list.columnTotals[field.name] ?? "" }}
                                </slot>
                            </template>
                        </objects-grid-body-cell>
                    </div>
                </slot>
            </template>
        </objects-grid>
        <!-- Bulk-actions bar: teleports into the sticky-stack bottom zone (order -1, so it stacks
             just above the always-pinned pagination footer) when a StickyStackProvider is present,
             otherwise renders inline here below the grid. Living in the bottom zone means selecting
             the first row only grows the document at the bottom (a small scrollbar change) instead
             of shoving the grid down. -->
        <sticky-chrome v-if="actions.selectedObjects.length > 0" zone="bottom" :order="-1" reveal="always">
            <div :class="theme('bulkActionsBar')" data-qa="view-list-bulk-actions">
                <div :class="theme('actionButtonGroupBar')" data-qa="view-list-action-buttons">
                    <template v-for="actionName in actions.bulkActions" :key="actionName">
                        <!-- @slot [bulk-action-button, button] Replaces an individual bulk action button. -->
                        <slot :name="bulkActionButtonSlotName.name" v-bind="themedButtonSlotProps[actionName]">
                            <link-model-view
                                button
                                :pk="themedButtonSlotProps[actionName].selectedObjects"
                                v-bind="omit(themedButtonSlotProps[actionName], ['selectedObjects'])"
                            />
                        </slot>
                    </template>
                    <template v-for="actionName in actions.availableTransitions" :key="actionName">
                        <!-- @slot [workflow-action-button, button] Replaces an individual workflow/transition action button. -->
                        <slot :name="workflowActionButtonSlotName.name" v-bind="themedButtonSlotProps[actionName]">
                            <link-model-view
                                button
                                :pk="themedButtonSlotProps[actionName].selectedObjects"
                                v-bind="omit(themedButtonSlotProps[actionName], ['selectedObjects'])"
                            />
                        </slot>
                    </template>
                </div>
            </div>
        </sticky-chrome>
        <!-- Pagination footer: teleports into the sticky-stack bottom zone (always shown) when a
             StickyStackProvider is present, otherwise renders inline here. -->
        <sticky-chrome v-if="pagination.paginateInfo?.totalRecords > 0" zone="bottom" reveal="always">
            <div :class="theme('paginationWrapper')" data-qa="view-list-pagination">
                <pagination-component
                    v-model:current-page="list.listState.currentPage"
                    :loading="list.instanceList.state.loading"
                    :rows="pagination.paginateInfo?.perPage"
                    :total-records="pagination.paginateInfo?.totalRecords"
                    :is-table="sort.isTable"
                    :showing-all-pages="pagination.computedShowAllPages"
                    :allow-show-all-pages="modelConfig.config?.allowShowAllPages && allowShowAllPages"
                    :show-total-record-num="modelConfig.config?.showTotalRecordNum && showTotalRecordNum"
                    @update:showing-all-pages="pagination.showingAllPages = $event"
                >
                    <template v-for="(_, slot) in slots" #[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps || {}" />
                    </template>
                </pagination-component>
            </div>
        </sticky-chrome>
    </div>
</template>
