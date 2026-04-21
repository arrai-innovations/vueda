/**
 * @module use/useViewList
 * @description Provides all reactive state and behavior for a paginated, sortable,
 * searchable Django model list view. Returns sub-grouped reactive state that a custom
 * shell component binds to directly, without re-implementing route synchronisation,
 * preference persistence, or the action/selection machinery.
 *
 * The view name `"list"` is a fixed convention throughout this composable: it maps to
 * the Django REST Framework list action, the client-side route `action` param, and the
 * model config view key. This is intentional and not a configurable option.
 *
 * @example Basic shell setup
 * ```vue
 * <script setup>
 * import { useViewList } from "@vueda/use/useViewList.js";
 * import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
 * import { useSlots } from "vue";
 *
 * const props = defineProps({ app: { type: String, required: true }, model: { type: String, required: true } });
 * const { modelConfig, list, actions, search, sort, columns, pagination } = useViewList(props);
 * const slots = useSlots();
 * const bulkActionButtonSlotName = useSlotNameResolver(["bulk-action-button", "button"]);
 * </script>
 * ```
 *
 * @example Wiring ObjectsGrid
 * ```html
 * <objects-grid
 *     :fields="list.computedFieldObjects"
 *     :loading="list.loading"
 *     :objects-in-order="list.instanceList.state.objectsInOrder"
 *     :related-objects="list.instanceList.state.relatedObjects"
 *     :calculated-objects="list.instanceList.state.calculatedObjects"
 *     :field-props="{ pkKey: modelConfig.info?.pk, modelInfo: modelConfig.info, modelConfig: modelConfig.config }"
 *     :sortables="sort.sorting.state.sortables"
 *     :sorted="sort.sorting.state.sorted"
 *     @update:sorted="sort.sorting.updateSorted"
 *     @update:is-table="sort.isTable = $event"
 * />
 * ```
 *
 * @example Wiring PaginationComponent
 * ```html
 * <pagination-component
 *     v-if="pagination.paginateInfo?.totalRecords > 0"
 *     v-model:current-page="list.listState.currentPage"
 *     :loading="list.instanceList.state.loading"
 *     :rows="pagination.paginateInfo?.perPage"
 *     :total-records="pagination.paginateInfo?.totalRecords"
 *     :is-table="sort.isTable"
 *     :showing-all-pages="pagination.computedShowAllPages"
 *     :allow-show-all-pages="modelConfig.config?.allowShowAllPages && allowShowAllPages"
 *     :show-total-record-num="modelConfig.config?.showTotalRecordNum && showTotalRecordNum"
 *     @update:showing-all-pages="pagination.showingAllPages = $event"
 * />
 * ```
 *
 * @example Wiring FilterGroup
 * ```html
 * <filter-group
 *     v-model="list.listState.filterArgs"
 *     :app="props.app"
 *     :model="props.model"
 *     :view="'list'"
 *     :error="list.instanceList.state.error"
 *     :errored="list.instanceList.state.errored"
 *     :filterables="props.filterables"
 *     :filterable-details="props.filterableDetails"
 * />
 * ```
 *
 * @example Wiring action buttons
 * ```html
 * <template v-for="actionName in actions.bulkActions" :key="actionName">
 *     <slot :name="bulkActionButtonSlotName.name" v-bind="actions.buttonSlotProps[actionName]">
 *         <link-model-view
 *             button
 *             :pk="actions.buttonSlotProps[actionName].selectedObjects"
 *             v-bind="omit(actions.buttonSlotProps[actionName], ['selectedObjects'])"
 *         />
 *     </slot>
 * </template>
 * ```
 *
 * @example Wiring search
 * ```html
 * <slot name="search" v-bind="search.searchSlotProps">
 *     <InputGroup>
 *         <InputGroupInput
 *             :model-value="search.searchSlotProps.listSearch"
 *             name="search"
 *             placeholder="Search"
 *             type="search"
 *             @search="search.filterList"
 *             @update:model-value="search.searchSlotProps.updateListSearch"
 *         />
 *         <InputGroupButton @click="search.filterList">Search</InputGroupButton>
 *     </InputGroup>
 * </slot>
 * ```
 *
 * @example Wiring column selector
 * ```html
 * <Select v-model="columns.columns" multiple>
 *     <SelectTrigger size="sm"><SelectValue>columns</SelectValue></SelectTrigger>
 *     <SelectContent>
 *         <SelectItem v-for="option in columns.columnOptions" :key="option.value" :value="option.value">
 *             {{ option.label }}
 *         </SelectItem>
 *     </SelectContent>
 * </Select>
 * ```
 *
 * @example Wiring MobileSortComponent
 * ```html
 * <mobile-sort-component
 *     v-if="sort.canShowMobileSorter"
 *     v-model:visible="sort.mobileSortDrawerVisible"
 *     :header="`Sort ${memoizedStartCase(modelConfig.config?.verboseNamePlural || 'items')}`"
 *     :field-details="modelConfig.config?.fieldDetails || {}"
 *     :sortables="sort.sortablesList"
 *     :sorted="sort.sorting.state.sorted"
 *     @update:sorted="sort.sorting.updateSorted"
 * />
 * ```
 */
import { assignReactiveObject, keyDiff, loadingCombine, union, useList } from "@arrai-innovations/reactive-helpers";
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { storeListPreference } from "@vueda/stores/storeListPreference.js";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import { EXPAND_PARAM, FIELDS_PARAM, ORDERING_PARAM, PAGE_PARAM, SEARCH_PARAM } from "@vueda/utils/constants.js";
import { ListFilterError } from "@vueda/utils/errors.js";
import { allPagePaginatedListCrudAdaptor, singlePagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEmpty from "lodash-es/isEmpty.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, inject, reactive, ref, toRef, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

/** @type {"list"} */
const VIEW_NAME = "list";

/**
 * @typedef {object} ViewListOptions
 *
 * Required identification.
 * @property {import('vue').Ref<string> | string} app - Django app label that owns the model.
 * @property {import('vue').Ref<string> | string} model - Django model name.
 *
 * Field configuration.
 * @property {import('vue').Ref<string[]> | string[]} [listFields] - Field names to fetch; uses the model config default when empty.
 * @property {import('vue').Ref<{[key: string]: object}> | {[key: string]: object}} [displayFields] - Display field overrides; uses the model config default when empty.
 * @property {import('vue').Ref<object[]> | object[]} [extraFieldObjects] - Synthetic field objects prepended to the display field list (e.g. the `selected_` checkbox column).
 *
 * Data fetching.
 * @property {import('vue').Ref<object> | object} [relatedObjectsRules] - Rules for fetching related objects alongside each row.
 * @property {import('vue').Ref<object> | object} [calculatedObjectsRules] - Rules for deriving calculated objects alongside each row.
 * @property {import('vue').Ref<object> | object} [params] - Extra query parameters merged into every API request.
 *
 * Pagination behaviour.
 * @property {import('vue').Ref<boolean> | boolean} [alwaysShowAllPages] - When true, always fetches and displays all pages.
 */

/**
 * @typedef {object} ViewListListGroup
 * @property {object} instanceList - The `useList` result; exposes `.state.objectsInOrder`, `.state.relatedObjects`, `.state.calculatedObjects`, `.state.loading`, `.state.error`, `.state.paginateInfo`, etc.
 * @property {import('vue').UnwrapNestedRefs<{currentPage: number, search: string, params: object, filterArgs: object}>} listState - Mutable reactive list state; `currentPage` and `filterArgs` are the primary mutation points.
 * @property {string} pkKey - The primary key field name (auto-unwrapped).
 * @property {object[]} computedFieldObjects - Ordered field descriptors for the grid, with column visibility applied.
 * @property {string[]} specialSlots - Slot name strings for extra field objects (e.g. `"field(selected_)"`); used to exclude them from generic slot forwarding.
 * @property {object} columnTotals - Map of field name to column total value.
 * @property {boolean} loading - Combined loading state (model config + instance list).
 * @property {boolean} errored - True when either model config or instance list has a non-filter error.
 * @property {Error|null} error - The active error, or null.
 * @property {() => void} dismissError - Clears all active errors.
 * @property {string} titleStr - Formatted page title derived from the model's verbose plural name.
 */

/**
 * @typedef {object} ViewListActionsGroup
 * @property {Set<string>} bulkActions - Action names that operate on selected objects.
 * @property {Set<string>} targetlessActions - Action names that require no selected objects.
 * @property {Set<string>} availableTransitions - Workflow transition codes available to the current user.
 * @property {{[actionName: string]: object}} buttonSlotProps - Ready-to-spread slot props for each action button; keyed by action name. Does not include a `class` property — shells supply their own.
 * @property {import('vue').Ref<(string|number)[]>} selectedObjects - Array of selected primary keys (auto-unwrapped in templates).
 * @property {(pk: string|number) => void} toggleSelectedObject - Adds or removes a primary key from the selection.
 */

/**
 * @typedef {object} ViewListSearchGroup
 * @property {string|null} listSearch - The current search input value (auto-unwrapped ref).
 * @property {() => void} filterList - Commits `listSearch` into `listState.search`, triggering a new list fetch.
 * @property {import('vue').UnwrapNestedRefs<object>} searchSlotProps - Ready-to-spread slot props for the `search` slot; includes `listSearch`, `filterList`, `updateListSearch`, `app`, `model`, `verb`, and `label`.
 */

/**
 * @typedef {object} ViewListSortGroup
 * @property {{state: {sortables: import('vue').ComputedRef<string[]|undefined>, sorted: string[]}, updateSorted: (sorted: string[]) => void}} sorting - Sorting state and updater.
 * @property {string[]} sortablesList - Flat list of sortable field names (auto-unwrapped).
 * @property {boolean} isTable - True when the grid is in table mode (auto-unwrapped ref; can be assigned via `@update:is-table`).
 * @property {boolean} mobileSortDrawerVisible - Whether the mobile sort drawer is open (auto-unwrapped ref; v-model compatible via `v-model:visible`).
 * @property {boolean} canShowMobileSorter - True when the mobile sorter should be rendered.
 */

/**
 * @typedef {object} ViewListColumnsGroup
 * @property {string[]} columns - Visible column field names (auto-unwrapped ref; v-model compatible).
 * @property {{label: string, value: string}[]} columnOptions - All available columns as label/value pairs for a select input.
 */

/**
 * @typedef {object} ViewListPaginationGroup
 * @property {boolean} computedShowAllPages - True when all pages should be loaded at once.
 * @property {boolean} showingAllPages - Whether the user has toggled "show all" on (auto-unwrapped ref; can be assigned via `@update:showing-all-pages`).
 * @property {object|undefined} paginateInfo - Shortcut to `instanceList.state.paginateInfo`; exposes `.totalRecords`, `.perPage`, `.totalPages`.
 */

/**
 * @typedef {object} ViewListContext
 * @property {import('@vueda/use/useModelConfig.js').ModelConfigState} modelConfig - Model metadata and view config.
 * @property {import('vue').UnwrapNestedRefs<ViewListListGroup>} list - Core list state and computed field data.
 * @property {import('vue').UnwrapNestedRefs<ViewListActionsGroup>} actions - Action buttons and row selection.
 * @property {import('vue').UnwrapNestedRefs<ViewListSearchGroup>} search - Search bar state and helpers.
 * @property {import('vue').UnwrapNestedRefs<ViewListSortGroup>} sort - Sorting and mobile sort drawer state.
 * @property {import('vue').UnwrapNestedRefs<ViewListColumnsGroup>} columns - Column visibility state.
 * @property {import('vue').UnwrapNestedRefs<ViewListPaginationGroup>} pagination - Pagination display state.
 */

/**
 * Extracts all reactive state and wiring for a Django model list view. The caller owns
 * the template; this composable owns route synchronisation, preference persistence,
 * list fetching, action/selection state, and column visibility.
 *
 * Pass the component's `props` directly — the composable reads what it needs via
 * reactive property access. `options` must be reactive (e.g. component props or a
 * `reactive({})` object) for prop changes to propagate correctly.
 *
 * Theme, slot name resolution, `useSlots`, and `emit` are all caller responsibilities
 * and are not handled by this composable.
 *
 * @param {ViewListOptions} options
 * @returns {ViewListContext}
 */
export function useViewList(options) {
    const listPreferenceStore = storeListPreference();
    const isInitialized = reactive({ sort: false, columns: false, filters: false });
    const listSearch = ref(null);
    const isActive = useIsActive();

    const appRef = toRef(options, "app");
    const modelRef = toRef(options, "model");

    const modelConfig = useModelConfig(appRef, modelRef, VIEW_NAME);

    if (!inject(LookupContextSymbol, null)) {
        useLookupContext();
    }

    const validAndActive = computed(
        () => !!(isActive.value && unref(appRef) && unref(modelRef) && modelConfig.loading === false),
    );

    const selectedObjects = ref([]);
    const workflow = useWorkflowTransitions(appRef, modelRef, isActive);
    const router = useRouter();
    const route = useRoute();
    const sorting = reactive({
        state: {
            sortables: computed(() => modelConfig?.config?.sortables),
            sorted: [],
        },
        updateSorted: (sorted) => {
            listPreferenceStore.setSorting({ app: unref(appRef), model: unref(modelRef) }, sorted);
            assignReactiveObject(sorting.state.sorted, sorted);
        },
    });

    const pkKey = computed(() => modelConfig.info?.pk ?? "id");
    const calculatedListFields = computed(() => {
        let fields = [];
        if (options.listFields?.length) {
            fields = [...options.listFields];
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
        if (Object.keys(options.displayFields || {}).length) {
            return Object.values(options.displayFields);
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
        modelConfig.config?.alwaysShowAllPages || options.alwaysShowAllPages ? true : showingAllPages.value,
    );

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
            app: appRef,
            model: modelRef,
        },
        pkKey: computed(() => modelConfig.info?.pk ?? "id"),
        params: toRef(listState, "params"),
        intendToList: validAndActive,
        relatedObjectsRules: toRef(options, "relatedObjectsRules"),
        calculatedObjectsRules: toRef(options, "calculatedObjectsRules"),
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

    watch(computedShowAllPages, (newVal, oldVal) => {
        if (newVal !== oldVal) {
            listState.currentPage = 1;
            instanceList.clearList();
            instanceList.list();
        }
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
            listPreferenceStore.setFilters({ app: unref(appRef), model: unref(modelRef) }, routeQuery);
            router.push({ query: routeQuery });
        } else {
            listState.params[SEARCH_PARAM] = newSearch;
            const routeQuery = { ...route.query, [SEARCH_PARAM]: newSearch };
            if (!isEqual(routeQuery, route.query)) {
                listPreferenceStore.setFilters({ app: unref(appRef), model: unref(modelRef) }, routeQuery);
                router.push({ query: routeQuery });
            }
        }
    });
    watch(
        () => route.query,
        (newQuery) => {
            if (!isInitialized.filters) {
                isInitialized.filters = true;
                const storedFilters = listPreferenceStore.getFilters({
                    app: unref(appRef),
                    model: unref(modelRef),
                });
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
        toRef(options, "params"),
        () => {
            assignReactiveObject(listState.params, options.params, [
                ...Object.keys(listState.filterArgs),
                ...alwaysParamsKeys,
            ]);
        },
        { deep: true, immediate: true },
    );
    watch(
        () => cloneDeep(listState.filterArgs),
        (newFilter, oldFilter) => {
            if (route.params?.action !== VIEW_NAME) {
                return;
            }
            if (!isEqual(newFilter, oldFilter)) {
                listState.currentPage = 1;
            }
            assignReactiveObject(listState.params, listState.filterArgs, [
                ...Object.keys(options.params || {}),
                ...alwaysParamsKeys,
                SEARCH_PARAM,
            ]);
            const filterQuery = omit(route.query, [SEARCH_PARAM]);
            if (!isEqual(newFilter, filterQuery)) {
                const routeQuery = {
                    ...(route.query[SEARCH_PARAM] ? { [SEARCH_PARAM]: route.query[SEARCH_PARAM] } : {}),
                    ...newFilter,
                };
                listPreferenceStore.setFilters({ app: unref(appRef), model: unref(modelRef) }, routeQuery);
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
                    app: unref(appRef),
                    model: unref(modelRef),
                    pk: unref(selectedObjects),
                    view: actionName,
                }),
            );
        };
    };

    const availableTransitions = computed(() => {
        return new Set(workflow.transitions.map((transition) => transition.code));
    });

    const translateExpandedField = (field) => {
        if (field?.name?.includes("__")) {
            return {
                ...field,
                value: field.value || field.name.replace(/__/g, "."),
            };
        }
        return field;
    };

    const columns = ref([]);
    const computedFieldObjects = computed(() => {
        const result = [];
        for (const field of options.extraFieldObjects || []) {
            result.push(translateExpandedField(field));
        }
        for (const field of calculatedDisplayFields.value) {
            if (columns.value.includes(field.name)) {
                result.push(translateExpandedField(field));
            }
        }
        return result;
    });
    const specialSlots = computed(() => (options.extraFieldObjects || []).map((field) => `field(${field.name})`));

    const filteredActions = useFilteredActions({ modelConfigInstance: modelConfig });
    const targetlessActions = computed(() => {
        const actions = filteredActions.actions || [];
        const actionDetails = modelConfig.config?.actionDetails || {};
        return new Set(
            actions.filter((name) => {
                const actionDetail = actionDetails[name];
                return actionDetail && VIEW_NAME !== name && !actionDetail.detail && !actionDetail.bulk;
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
                        app: appRef,
                        model: modelRef,
                        view: addedKey,
                        label: memoizedStartCase(addedKey),
                        click: isBulk ? detailActionOnClick(addedKey) : undefined,
                        selectedObjects: isBulk ? selectedObjects : undefined,
                        disabled: isBulk ? computed(() => (!addedKey) in availableTransitions.value) : undefined,
                    };
                });
            }
            for (const removedKey of removedKeys) {
                if (buttonSlotProps[removedKey].disabled) {
                    buttonSlotProps[removedKey].disabled.effect?.stop();
                }
                delete buttonSlotProps[removedKey];
            }
        },
        { immediate: true },
    );

    const searchSlotProps = reactive({
        app: appRef,
        model: modelRef,
        verb: "search",
        label: "Search",
        filterList,
        listSearch,
        updateListSearch: (value) => {
            listSearch.value = value;
        },
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

    watch(
        calculatedDisplayFields,
        (newFields, oldFields) => {
            if (!isInitialized.columns) {
                const fieldNames = newFields.map((field) => field?.name);
                if (!fieldNames.length) {
                    columns.value = [];
                    return;
                }
                const hidden =
                    listPreferenceStore.getHiddenColumns({ app: unref(appRef), model: unref(modelRef) }) || [];
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
                const storedSorting = listPreferenceStore.getSorting({ app: unref(appRef), model: unref(modelRef) });
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
            listPreferenceStore.setHiddenColumns({ app: unref(appRef), model: unref(modelRef) }, hidden);
        },
        { deep: true },
    );
    const columnOptions = computed(() => {
        return calculatedDisplayFields.value.map((field) => ({
            label: field.label || memoizedStartCase(field.name),
            value: field.name,
        }));
    });

    const paginateInfo = computed(() => instanceList.state.paginateInfo);

    return {
        modelConfig,
        list: reactive({
            instanceList,
            listState,
            pkKey,
            computedFieldObjects,
            specialSlots,
            columnTotals,
            loading,
            errored,
            error,
            dismissError,
            titleStr,
        }),
        actions: reactive({
            bulkActions,
            targetlessActions,
            availableTransitions,
            buttonSlotProps,
            selectedObjects,
            toggleSelectedObject,
        }),
        search: reactive({
            listSearch,
            filterList,
            searchSlotProps,
        }),
        sort: reactive({
            sorting,
            sortablesList,
            isTable,
            mobileSortDrawerVisible,
            canShowMobileSorter,
        }),
        columns: reactive({
            columns,
            columnOptions,
        }),
        pagination: reactive({
            computedShowAllPages,
            showingAllPages,
            paginateInfo,
        }),
    };
}
