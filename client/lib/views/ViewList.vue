<script setup>
import { assignReactiveObject, keyDiff, loadingCombine, union, useList } from "@arrai-innovations/reactive-helpers";
import ErrorDisplay from "@vueda/components/ErrorDisplay.vue";
import FilterGroup from "@vueda/components/FilterGroup.vue";
import FormFeedback from "@vueda/components/FormFeedback.vue";
import LinkModelView from "@vueda/components/LinkModelView.vue";
import MobileSortComponent from "@vueda/components/MobileSortComponent.vue";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import ObjectsGridBodyCell from "@vueda/components/ObjectsGridBodyCell.vue";
import PageTitle from "@vueda/components/PageTitle.vue";
import PaginationComponent from "@vueda/components/PaginationComponent.vue";
import StickyBar from "@vueda/components/StickyBar.vue";
import ControlCheckbox from "@vueda/controls/checkbox/ControlCheckbox.vue";
import ControlInputGroup from "@vueda/controls/input-group/ControlInputGroup.vue";
import ControlInputGroupButton from "@vueda/controls/input-group/ControlInputGroupButton.vue";
import ControlInputGroupInput from "@vueda/controls/input-group/ControlInputGroupInput.vue";
import ControlSelect from "@vueda/controls/select/ControlSelect.vue";
import ControlSelectContent from "@vueda/controls/select/ControlSelectContent.vue";
import ControlSelectItem from "@vueda/controls/select/ControlSelectItem.vue";
import ControlSelectTrigger from "@vueda/controls/select/ControlSelectTrigger.vue";
import ControlSelectValue from "@vueda/controls/select/ControlSelectValue.vue";
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { storeListPreference } from "@vueda/stores/storeListPreference.js";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { getCRUDName, memoizedStartCase } from "@vueda/utils/case.js";
import { EXPAND_PARAM, FIELDS_PARAM, ORDERING_PARAM, PAGE_PARAM, SEARCH_PARAM } from "@vueda/utils/constants.js";
import { ListFilterError } from "@vueda/utils/errors.js";
import { allPagePaginatedListCrudAdaptor, singlePagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEmpty from "lodash-es/isEmpty.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import {
    computed,
    effectScope,
    inject,
    onMounted,
    reactive,
    readonly,
    ref,
    toRef,
    toRefs,
    unref,
    useSlots,
    watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";

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
const listPreferenceStore = storeListPreference();
const isInitialized = reactive({
    sort: false,
    columns: false,
    filters: false,
});
const listSearch = ref(null);
const isActive = useIsActive();
const validAndActive = computed(() => !!(isActive.value && props.app && props.model && modelConfig.loading === false));
const viewName = "list";
const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), viewName);

if (!inject(LookupContextSymbol, null)) {
    useLookupContext();
}

const selectedObjects = ref([]);
const workflow = useWorkflowTransitions(toRef(props, "app"), toRef(props, "model"), isActive);
const router = useRouter();
const route = useRoute();
const sorting = reactive({
    state: {
        sortables: computed(() => modelConfig?.config?.sortables),
        sorted: [],
    },
    updateSorted: (sorted) => {
        listPreferenceStore.setSorting({ app: props.app, model: props.model }, sorted);
        assignReactiveObject(sorting.state.sorted, sorted);
    },
});
const slots = useSlots();
const pkKey = computed(() => modelConfig.info?.pk ?? "id");
const calculatedListFields = computed(() => {
    let fields = [];
    if (props.listFields.length) {
        fields = [...props.listFields];
    } else if (modelConfig.config.fetchFields?.length) {
        fields = [...modelConfig.config.fetchFields];
    }
    const unrefPKKey = unref(pkKey);
    if (!fields.includes(unrefPKKey)) {
        fields.unshift(unrefPKKey);
    }
    return fields;
});
const calculatedDisplayFields = computed(() => {
    if (Object.keys(props.displayFields).length) {
        return Object.values(props.displayFields);
    } else {
        return (
            modelConfig.config.displayFields?.map((f) => ({
                name: f,
                ...modelConfig.config.fieldDetails[f],
            })) || []
        );
    }
});
const showingAllPages = ref(false);
const computedShowAllPages = computed(() =>
    modelConfig.config?.alwaysShowAllPages || props.alwaysShowAllPages ? true : showingAllPages.value,
);
watch(computedShowAllPages, (newVal, oldVal) => {
    if (newVal !== oldVal) {
        listState.currentPage = 1;
        instanceList.clearList();
        instanceList.list();
    }
});
const alwaysParamsKeys = [ORDERING_PARAM, FIELDS_PARAM, EXPAND_PARAM];
const listState = reactive({
    currentPage: 1,
    search: "",
    params: {
        [ORDERING_PARAM]: toRef(sorting.state, "sorted"),
        [FIELDS_PARAM]: calculatedListFields,
        [EXPAND_PARAM]: computed(() => modelConfig.config?.expand),
    },
    filterArgs: {},
});
const instanceListProps = reactive({
    target: {
        app: toRef(props, "app"),
        model: toRef(props, "model"),
    },
    pkKey: computed(() => modelConfig.info?.pk ?? "id"),
    params: toRef(listState, "params"),
    intendToList: validAndActive,
    // intendToSubscribe: validAndActive,
    relatedObjectsRules: toRef(props, "relatedObjectsRules"),
    calculatedObjectsRules: toRef(props, "calculatedObjectsRules"),
});
const instanceList = useList({
    props: instanceListProps,
    handlers: {
        list: (...args) =>
            computedShowAllPages.value
                ? allPagePaginatedListCrudAdaptor(...args)
                : singlePagePaginatedListCrudAdaptor(...args),
    },
});
watch(toRef(listState, "search"), (newSearch, oldSearch) => {
    if (newSearch !== oldSearch) {
        listState.currentPage = 1;
    }
});
watch([toRef(listState, "currentPage"), toRef(listState, "search")], ([newPage, newSearch]) => {
    instanceList.clearList({ keepPagination: true });
    if (newPage <= 1 || newPage > instanceList.state.paginateInfo?.totalPages) {
        if (newPage !== 1) {
            // if there are no valid pages, just set 1 the once.
            newPage = listState.currentPage = 1;
        }
    }
    if (newPage === 1) {
        delete listState.params[PAGE_PARAM];
    } else {
        listState.params[PAGE_PARAM] = newPage;
    }
    if (!newSearch) {
        delete listState.params[SEARCH_PARAM];
        const routeQuery = omit(route.query, [SEARCH_PARAM]);
        listPreferenceStore.setFilters({ app: props.app, model: props.model }, routeQuery);
        router.push({ query: routeQuery });
    } else {
        listState.params[SEARCH_PARAM] = newSearch;
        const routeQuery = { ...route.query, [SEARCH_PARAM]: newSearch };
        if (!isEqual(routeQuery, route.query)) {
            listPreferenceStore.setFilters({ app: props.app, model: props.model }, routeQuery);
            router.push({ query: routeQuery });
        }
    }
});
watch(
    () => route.query,
    (newQuery) => {
        if (!isInitialized.filters) {
            isInitialized.filters = true;
            const storedFilters = listPreferenceStore.getFilters({ app: props.app, model: props.model });
            if (storedFilters && isEmpty(newQuery)) {
                router.push({ query: storedFilters });
            }
        }
        const searchQuery = newQuery[SEARCH_PARAM] || "";
        if (!isEqual(searchQuery, listState.search)) {
            listSearch.value = searchQuery;
            listState.search = searchQuery;
        }
    },
    { immediate: true },
);
watch(
    toRef(props, "params"),
    () => {
        assignReactiveObject(listState.params, props.params, [
            ...Object.keys(listState.filterArgs),
            ...alwaysParamsKeys,
        ]);
    },
    { deep: true, immediate: true },
);

watch(
    () => cloneDeep(listState.filterArgs),
    (newFilter, oldFilter) => {
        if (route.params?.action !== "list") {
            return; // ignore watcher, component is already being switched out
        }
        if (!isEqual(newFilter, oldFilter)) {
            listState.currentPage = 1;
        }
        assignReactiveObject(listState.params, listState.filterArgs, [
            ...Object.keys(props.params),
            ...alwaysParamsKeys,
            SEARCH_PARAM,
        ]);
        const filterQuery = omit(route.query, [SEARCH_PARAM]);
        if (!isEqual(newFilter, filterQuery)) {
            const routeQuery = {
                ...(route.query[SEARCH_PARAM] ? { [SEARCH_PARAM]: route.query[SEARCH_PARAM] } : {}),
                ...newFilter,
            };
            listPreferenceStore.setFilters({ app: props.app, model: props.model }, routeQuery);
            router.push({ query: routeQuery });
        }
    },
    { deep: true },
);

const loading = computed(() => loadingCombine(instanceList.state.loading, modelConfig.loading));
const titleStr = computed(() => `List ${memoizedStartCase(modelConfig.config?.verboseNamePlural || "items")}`);
const errored = computed(() =>
    modelConfig.errored || (instanceList.state.errored && !(instanceList.state.error instanceof ListFilterError))
        ? instanceList.state.errored
        : false,
);
const error = computed(() =>
    modelConfig.error || (instanceList.state.error && !(instanceList.state.error instanceof ListFilterError))
        ? instanceList.state.error
        : null,
);

const dismissError = () => {
    modelConfig.clearError();
    instanceList.clearError();
};

const filterList = () => {
    listState.search = listSearch.value;
};

const toggleSelectedObject = (pk) => {
    const idx = selectedObjects.value.indexOf(pk);
    if (idx === -1) {
        selectedObjects.value.push(pk);
    } else {
        selectedObjects.value.splice(idx, 1);
    }
};

const detailActionOnClick = (actionName) => {
    return async () => {
        await router.push(
            await getCRUDForTo({
                app: props.app,
                model: props.model,
                pk: unref(selectedObjects),
                view: actionName,
            }),
        );
    };
};
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
        toRef(() => instanceList.state.objects),
    );
    emit(
        "order",
        toRef(() => instanceList.state.order),
    );
    emit(
        "sorted",
        toRef(() => sorting.state.sorted),
    );
    emit("selected", readonly(selectedObjects));
    emit("loading", loading.value);
    emit("related-objects", readonly(instanceList.state.relatedObjects));
    emit("calculated-objects", readonly(instanceList.state.calculatedObjects));
});

const availableTransitions = computed(() => {
    return new Set(workflow.transitions.map((transition) => transition.code));
});

const translateExpandedField = (field) => {
    // model config display fields uses django double underscore notation for expanded fields
    // but objects-grid expects dot notation
    // to preserve slot names, we don't want to change the field's 'name'.
    // but we can override the 'value' to be the dot notation, if not otherwise specified
    if (field?.name?.includes("__")) {
        return {
            ...field,
            value: field.value || field.name.replace(/__/g, "."),
        };
    }
    return field;
};

const computedFieldObjects = computed(() => {
    const result = [];
    for (const field of props.extraFieldObjects) {
        result.push(translateExpandedField(field));
    }
    for (const field of calculatedDisplayFields.value) {
        if (columns.value.includes(field.name)) {
            result.push(translateExpandedField(field));
        }
    }
    return result;
});
const specialSlots = props.extraFieldObjects.map((field) => `field(${field.name})`);
const themeOverride = computed(() => {
    return props.themeOverride?.["ViewList"];
});
const theme = useTheme(
    "ViewList",
    props,
    reactive({
        ...toRefs(props),
        loading,
        errored,
        error,
    }),
);
const filteredActions = useFilteredActions({
    modelConfigInstance: modelConfig,
});
const targetlessActionButtonSlotName = useSlotNameResolver(["targetless-action-button", "button"]);
const bulkActionButtonSlotName = useSlotNameResolver(["bulk-action-button", "button"]);
const workflowActionButtonSlotName = useSlotNameResolver(["workflow-action-button", "button"]);
const targetlessActions = computed(() => {
    const actions = filteredActions.actions || [];
    const actionDetails = modelConfig.config?.actionDetails || {};
    return new Set(
        actions.filter((name) => {
            const actionDetail = actionDetails[name];
            return actionDetail && viewName !== name && !actionDetail.detail && !actionDetail.bulk;
        }),
    );
});

const bulkActions = computed(() => {
    const actions = filteredActions.actions || [];
    const actionDetails = modelConfig.config?.actionDetails || {};
    return new Set(actions.filter((name) => actionDetails[name]?.bulk));
});

const buttonSlotProps = reactive({});
const bspEffectScope = effectScope();
watch(
    [bulkActions, targetlessActions, availableTransitions],
    ([newBulkActions, newTargetlessActions, newTransitions]) => {
        const bulkActionSet = newBulkActions || new Set();
        const targetlessActionSet = newTargetlessActions || new Set();
        const availableTransitionsSet = newTransitions || new Set();
        const { addedKeys, removedKeys } = keyDiff(
            union(union(bulkActionSet, targetlessActionSet), availableTransitionsSet),
            Object.keys(buttonSlotProps),
        );
        for (const addedKey of addedKeys) {
            const isBulk = bulkActionSet.has(addedKey) || availableTransitionsSet.has(addedKey);
            bspEffectScope.run(() => {
                buttonSlotProps[addedKey] = {
                    app: toRef(props, "app"),
                    model: toRef(props, "model"),
                    view: addedKey,
                    label: memoizedStartCase(addedKey),
                    click: isBulk ? detailActionOnClick(addedKey) : undefined,
                    selectedObjects: isBulk ? selectedObjects : undefined,
                    disabled: isBulk ? computed(() => (!addedKey) in availableTransitions.value) : undefined,
                    class: isBulk ? theme("bulkActionButton") : theme("targetlessActionButton"),
                };
            });
        }
        for (const removedKey of removedKeys) {
            if (buttonSlotProps[removedKey].disabled) {
                // internal vue api, but if we are here, we are deleting before the end of the scope
                buttonSlotProps[removedKey].disabled.effect?.stop();
            }
            delete buttonSlotProps[removedKey];
        }
    },
    { immediate: true },
);
const searchSlotProps = reactive({
    app: toRef(props, "app"),
    model: toRef(props, "model"),
    verb: "search",
    label: "Search",
    filterList,
    listSearch,
    updateListSearch: (value) => {
        listSearch.value = value;
    },
    searchInputClass: theme("searchInput"),
});

const isTable = ref(true);
const columnTotals = computed(() => instanceList.state.columnTotals || {});
const mobileSortDrawerVisible = ref(false);
const sortablesList = computed(() => unref(sorting.state.sortables) || []);
const canShowMobileSorter = computed(() => !isTable.value && sortablesList.value.length > 0);
watch([isTable, sortablesList], ([newIsTable, newSortables]) => {
    if (newIsTable || !newSortables.length) {
        mobileSortDrawerVisible.value = false;
    }
});
const columns = ref([]);
watch(
    calculatedDisplayFields,
    (newFields, oldFields) => {
        if (!isInitialized.columns) {
            const fieldNames = newFields.map((field) => field?.name);

            if (!fieldNames.length) {
                columns.value = [];
                return;
            }
            const hidden = listPreferenceStore.getHiddenColumns({ app: props.app, model: props.model }) || [];
            const hiddenSet = new Set(hidden);
            const visible = fieldNames.filter((name) => !hiddenSet.has(name));
            columns.value = visible.length > 0 ? visible : [...fieldNames];
            isInitialized.columns = true;
        } else {
            const fieldNames = newFields.map((field) => field?.name).filter((name) => !!name);
            const oldFieldNames = oldFields.map((field) => field?.name).filter((name) => !!name);
            const newFieldNames = fieldNames.filter((name) => !oldFieldNames.includes(name));

            if (newFieldNames.length) {
                columns.value = [...columns.value, ...newFieldNames];
            }
        }
    },
    { immediate: true, deep: true },
);
watch(
    toRef(sorting.state, "sortables"),
    (sortables) => {
        if (sortables && !isInitialized.sort) {
            isInitialized.sort = true;
            const storedSorting = listPreferenceStore.getSorting({ app: props.app, model: props.model });
            if (storedSorting) {
                sorting.updateSorted(storedSorting);
            }
        }
    },
    { immediate: true, deep: true },
);
watch(
    columns,
    (newColumns) => {
        if (!isInitialized.columns) {
            return;
        }
        const fieldNames = calculatedDisplayFields.value.map((field) => field?.name);

        const hidden = fieldNames.filter((name) => !newColumns.includes(name));
        listPreferenceStore.setHiddenColumns({ app: props.app, model: props.model }, hidden);
    },
    { deep: true },
);
const columnOptions = computed(() => {
    return calculatedDisplayFields.value.map((field) => ({
        label: field.label || memoizedStartCase(field.name),
        value: field.name,
    }));
});
</script>
<template>
    <div>
        <page-title :loading="instanceList.state.loading" :title="titleStr">
            <template #button>
                <slot name="targetless-action-buttons" :targetless-actions="targetlessActions">
                    <template
                        v-for="actionName in targetlessActions"
                        :key="getCRUDName({ app: app, model: model, view: actionName })"
                    >
                        <!-- @slot [targetless-action-button, button] Replaces an individual targetless action button. -->
                        <slot :name="targetlessActionButtonSlotName.name" v-bind="buttonSlotProps[actionName]">
                            <link-model-view v-bind="buttonSlotProps[actionName]" />
                        </slot>
                    </template>
                </slot>
            </template>
            <template #under-actions>
                <div :class="theme('underActionsBar')" data-qa="view-list-under-actions">
                    <div :class="theme('actionButtonGroupBar')" data-qa="view-list-action-buttons">
                        <template v-for="actionName in bulkActions" :key="actionName">
                            <!-- @slot [bulk-action-button, button] Replaces an individual bulk action button. -->
                            <slot :name="bulkActionButtonSlotName.name" v-bind="buttonSlotProps[actionName]">
                                <link-model-view
                                    button
                                    :pk="buttonSlotProps[actionName].selectedObjects"
                                    v-bind="omit(buttonSlotProps[actionName], ['selectedObjects'])"
                                />
                            </slot>
                        </template>
                        <template v-for="actionName in availableTransitions" :key="actionName">
                            <!-- @slot [workflow-action-button, button] Replaces an individual workflow/transition action button. -->
                            <slot :name="workflowActionButtonSlotName.name" v-bind="buttonSlotProps[actionName]">
                                <link-model-view
                                    button
                                    :pk="buttonSlotProps[actionName].selectedObjects"
                                    v-bind="omit(buttonSlotProps[actionName], ['selectedObjects'])"
                                />
                            </slot>
                        </template>
                    </div>
                    <div :class="theme('listControlBar')">
                        <slot name="search" v-bind="searchSlotProps">
                            <ControlInputGroup>
                                <ControlInputGroupInput
                                    :class="theme('searchInput')"
                                    :model-value="searchSlotProps.listSearch"
                                    name="search"
                                    placeholder="Search"
                                    type="search"
                                    @search="searchSlotProps.filterList"
                                    @update:model-value="searchSlotProps.updateListSearch"
                                />
                                <ControlInputGroupButton @click="searchSlotProps.filterList">
                                    Search
                                </ControlInputGroupButton>
                            </ControlInputGroup>
                        </slot>
                        <slot
                            v-if="modelConfig.config?.allowColumnHiding || allowColumnHiding"
                            name="columns-select"
                            :columns="columns"
                            :options="columnOptions"
                            :loading="loading"
                        >
                            <ControlSelect v-model="columns" multiple>
                                <ControlSelectTrigger size="sm">
                                    <ControlSelectValue>
                                        <slot name="columns-select-value-label">columns</slot>
                                    </ControlSelectValue>
                                    <template v-if="slots['columns-select-dropdown-icon']" #icon>
                                        <slot name="columns-select-dropdown-icon" />
                                    </template>
                                </ControlSelectTrigger>
                                <ControlSelectContent>
                                    <ControlSelectItem
                                        v-for="option in columnOptions"
                                        :key="option.value"
                                        :value="option.value"
                                    >
                                        {{ option.label }}
                                    </ControlSelectItem>
                                </ControlSelectContent>
                            </ControlSelect>
                        </slot>
                    </div>
                </div>
            </template>
        </page-title>
        <sticky-bar :class="theme('filterGroupBar')">
            <filter-group
                v-model="listState.filterArgs"
                :app="props.app"
                :model="props.model"
                :view="viewName"
                :error="instanceList.state.error"
                :errored="instanceList.state.errored"
                :filterable-details="props.filterableDetails"
                :filterables="props.filterables"
                @filter-change="emit('filter-change', $event)"
                @hide-filter-form="emit('hide-filter-form', $event)"
                @query-change="emit('query-change', $event)"
            >
                <template v-for="(_, slot) in slots" #[slot]="slotProps">
                    <slot :name="slot" v-bind="slotProps || {}" />
                </template>
            </filter-group>
            <div :class="theme('sortComponentDiv')">
                <mobile-sort-component
                    v-if="canShowMobileSorter"
                    v-model:visible="mobileSortDrawerVisible"
                    :header="`Sort ${memoizedStartCase(modelConfig.config?.verboseNamePlural || 'items')}`"
                    :field-details="modelConfig.config?.fieldDetails || {}"
                    :sortables="sortablesList"
                    :sorted="sorting.state.sorted"
                    @update:sorted="sorting.updateSorted"
                >
                    <template v-for="(_, slot) in slots" #[slot]="slotProps">
                        <slot :name="slot" v-bind="slotProps || {}" />
                    </template>
                </mobile-sort-component>
            </div>
        </sticky-bar>

        <slot name="additional-errors" />
        <error-display :error="error" :errored="errored" @dismiss-error="dismissError" />
        <!-- todo: filters/search -->
        <!-- todo: hide/show columns -->
        <!-- todo: filters return here? @submit=filterList -->
        <slot name="before-list">
            <div class="max-w-full overflow-x-auto p-1 flex flex-col gap-2">
                <form-feedback type="error" />
                <form-feedback type="message" />
            </div>
        </slot>
        <objects-grid
            v-bind="$attrs"
            :calculated-objects="instanceList.state.calculatedObjects"
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
            :fields="computedFieldObjects"
            :loading="loading"
            :objects-in-order="instanceList.state.objectsInOrder"
            :related-objects="instanceList.state.relatedObjects"
            :sortables="sorting.state.sortables"
            :sorted="sorting.state.sorted"
            :table-breakpoint="tableBreakpoint"
            :theme-override="themeOverride"
            @update:sorted="sorting.updateSorted"
            @update:is-table="isTable = $event"
        >
            <template
                v-for="slot in Object.keys(slots).filter((slot) => !specialSlots.includes(slot))"
                #[slot]="slotProps"
            >
                <slot :name="slot" v-bind="slotProps || {}"></slot>
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
                    :has-selectable-actions="bulkActions.size || availableTransitions.size"
                    :name="`field(${field.name})`"
                >
                    <ControlCheckbox
                        v-if="bulkActions.size || availableTransitions.size"
                        :id="`selected-row-${slotProps.pk}`"
                        :model-value="selectedObjects.includes(slotProps.pk)"
                        name="selected"
                        v-bind="slotProps"
                        @update:model-value="toggleSelectedObject(slotProps.pk)"
                    />
                </slot>
            </template>
            <template #row-after-objects="slotProps">
                <slot name="row-after-objects" v-bind="slotProps" :column-totals="columnTotals">
                    <div v-if="isTable && Object.keys(columnTotals).length" :class="slotProps.class" role="row">
                        <objects-grid-body-cell
                            v-for="(field, index) in computedFieldObjects"
                            :key="field.name"
                            :field="field"
                            :obj="{}"
                            :related-object="{}"
                            :calculated-object="{}"
                            :row-index="0"
                            :column-index="index"
                            :row-count="1"
                            :column-count="computedFieldObjects.length"
                            :pk-key="pkKey"
                            :class="theme('columnTotalCell')"
                        >
                            <template #value>
                                <slot :name="`field(${field.name})totals`" :value="columnTotals[field.name]">
                                    {{ columnTotals[field.name] ?? "" }}
                                </slot>
                            </template>
                        </objects-grid-body-cell>
                    </div>
                </slot>
            </template>
        </objects-grid>
        <pagination-component
            v-if="instanceList.state.paginateInfo?.totalRecords > 0"
            v-model:current-page="listState.currentPage"
            :loading="instanceList.state.loading"
            :rows="instanceList.state.paginateInfo?.perPage"
            :total-records="instanceList.state.paginateInfo?.totalRecords"
            :is-table="isTable"
            :showing-all-pages="computedShowAllPages"
            :allow-show-all-pages="modelConfig.config?.allowShowAllPages && allowShowAllPages"
            :show-total-record-num="modelConfig.config?.showTotalRecordNum && showTotalRecordNum"
            @update:showing-all-pages="showingAllPages = $event"
        >
            <template v-for="(_, slot) in slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps || {}" />
            </template>
        </pagination-component>
    </div>
</template>
