/**
 * @module use/useViewList
 * @description Provides all reactive state and behaviour for a paginated, sortable,
 * searchable Django model list view. Returns sub-grouped reactive state that a custom
 * shell component binds to directly, without re-implementing route synchronization,
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
 * const { modelConfig, list, actions, search, sort, columns, pagination, filter } = useViewList(props);
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
 * @example Wiring PaginationFooter
 * ```html
 * <pagination-footer
 *     v-if="pagination.paginateInfo?.totalRecords > 0"
 *     v-model:current-page="list.listState.currentPage"
 *     v-model:per-page="list.listState.perPage"
 *     :loading="list.instanceList.state.loading"
 *     :rows="pagination.paginateInfo?.perPage"
 *     :total-records="pagination.paginateInfo?.totalRecords"
 *     :is-table="sort.isTable"
 *     :page-size-options="pageSizeOptions"
 *     :show-total-record-num="modelConfig.config?.showTotalRecordNum && showTotalRecordNum"
 * />
 * ```
 *
 * @example Wiring FilterGroup
 * ```html
 * <filter-group
 *     v-model="filter.state.addedFilters"
 *     :app="props.app"
 *     :model="props.model"
 *     :view="'list'"
 *     :error="list.instanceList.state.error"
 *     :errored="list.instanceList.state.errored"
 *     :filterables="filter.filterables"
 *     :filterable-details="filter.filterableDetails"
 *     :valid-filterables="filter.validFilterables"
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
 */
import { assignReactiveObject, keyDiff, loadingCombine, union, useList } from "@arrai-innovations/reactive-helpers";
import { getCRUDForTo } from "@vueda/router/getCrud.js";
import { storeListPreference } from "@vueda/stores/storeListPreference.js";
import { buildFilterFromQuery, filtersToParams, getFilterParams } from "@vueda/use/useFilterForm.js";
import { useFilterables } from "@vueda/use/useFilterables.js";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import {
    ALL_PAGES,
    DEFAULT_PAGE_SIZE,
    DEFAULT_PAGE_SIZE_OPTIONS,
    EXPAND_PARAM,
    FIELDS_PARAM,
    ORDERING_PARAM,
    PAGE_PARAM,
    PAGE_SIZE_PARAM,
    SEARCH_PARAM,
} from "@vueda/utils/constants.js";
import { ListFilterError } from "@vueda/utils/errors.js";
import { allPagePaginatedListCrudAdaptor, singlePagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import { resolveColumns } from "@vueda/utils/resolveColumnComponents.js";
import { formatSortQuery, parseSortQuery, sanitizeSortFields } from "@vueda/utils/sortedFields.js";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import isEmpty from "lodash-es/isEmpty.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, inject, markRaw, reactive, ref, toRaw, toRef, unref, watch } from "vue";
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
 * @property {import('vue').Ref<{[name:string]: any}> | {[name:string]: any}} [columnComponents] - Per-field column adapter overrides (component, `() => component`, or a string key into `availableColumns`); highest-precedence non-slot override.
 * @property {import('vue').Ref<{[name:string]: object}> | {[name:string]: object}} [columnProps] - Per-field prop overrides forwarded to the resolved column adapter.
 *
 * Data fetching.
 * @property {import('vue').Ref<object> | object} [relatedObjectsRules] - Rules for fetching related objects alongside each row.
 * @property {import('vue').Ref<object> | object} [calculatedObjectsRules] - Rules for deriving calculated objects alongside each row.
 * @property {import('vue').Ref<object> | object} [params] - Extra query parameters merged into every API request.
 *
 * Filter configuration.
 * @property {import('vue').Ref<string[]> | string[]} [filterables] - Field names to show as filters; overrides the model config's declared list when set.
 * @property {import('vue').Ref<object> | object} [filterableDetails] - Per-field filter detail overrides merged with the model config's declared details.
 *
 * Pagination behaviour.
 * @property {(number|string)} [defaultPageSize] - Initial rows-per-page when no preference is stored (a number, or `"all"`). Defaults to `DEFAULT_PAGE_SIZE`.
 * @property {(number|string)[]} [pageSizeOptions] - Rows-per-page options offered by the footer; the final `"all"` entry loads every page. Defaults to `DEFAULT_PAGE_SIZE_OPTIONS`.
 *
 * Action styling.
 * @property {import('vue').Ref<string[]> | string[]} [primaryActions] - Targetless action names promoted to the filled hero CTA; defaults to `["create"]`.
 */

/**
 * @typedef {object} ViewListListGroup
 * @property {object} instanceList - The `useList` result; exposes `.state.objectsInOrder`, `.state.relatedObjects`, `.state.calculatedObjects`, `.state.loading`, `.state.error`, `.state.paginateInfo`, etc.
 * @property {import('vue').UnwrapNestedRefs<{currentPage: number, perPage: (number|string), search: string, params: object}>} listState - Mutable reactive list state; `currentPage` and `perPage` are the primary mutation points. See `filter.state.addedFilters` for filter state. `listState.params` also carries a server-hidden filter's URL value (e.g. the deep-link `id` filter), sourced from the URL rather than `addedFilters`, and stays present across visible-filter, sort, and search changes until the URL itself drops it.
 * @property {string} pkKey - The primary key field name (auto-unwrapped).
 * @property {object[]} computedFieldObjects - Ordered field descriptors for the grid, with column visibility applied.
 * @property {string[]} specialSlots - Slot name strings for extra field objects (e.g. `"field(selected_)"`); used to exclude them from generic slot forwarding.
 * @property {{[name:string]: import('@vueda/utils/resolveColumnComponents.js').ResolvedColumn}} columnComponents - Per-display-field resolved column adapter `{ component, props }`, applying the override precedence chain. ViewList injects these as default `field(<col>)` slot content.
 * @property {string[]} columnSlots - `field(<col>)` slot names for resolved columns; excluded from the generic consumer-slot forward loop to avoid double-rendering.
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
 * @property {Set<string>} primaryActions - Targetless action names promoted to the filled hero CTA.
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
 * @property {{state: {sortables: import('vue').ComputedRef<string[]|undefined>, sorted: string[]}, updateSorted: (sorted: string[]) => void}} sorting - Sorting state and updater. `state.sorted` is the sort in effect, for display: it holds `defaultSorted` while the reader has not chosen a sort. What the list request sends as its ordering param is the chosen sort alone, so an untouched default is shown without being sent.
 * @property {string[]} sortablesList - Flat list of sortable field names (auto-unwrapped).
 * @property {string[]} defaultSorted - The configured default sort order (from `modelConfig.config.sorted`, which is the server's `model_ordering.default` unless a project overrode it), sanitized against `sortablesList` (auto-unwrapped). Shown whenever the URL carries no sort: on first load a stored preference wins over it, and after that it is what the read-out falls back to. It is a report of what the server does on its own, so it is never sent back as an ordering param, and it stays out of the URL as well. Sending it would replace the ordering the server applies, which is not always the same order: a ranked search sorts by relevance while the param is absent, and a default declared as an expression (`Lower("name")`) sorts by that expression rather than by the bare column reported here. Pass it to `SortGroup` as `defaultSorted` so its Reset sort control knows when it has something to do; the reset itself arrives as an empty `update:sorted`, and `updateSorted` resolves it to this array.
 * @property {boolean} isTable - True when the grid is in table mode (auto-unwrapped ref; can be assigned via `@update:is-table`).
 * @property {boolean} mobileSortDrawerVisible - Whether the deprecated mobile sort shell is open (auto-unwrapped ref; v-model compatible via `v-model:visible`). Deprecated: SortControl owns its own open state.
 * @property {boolean} canShowSorter - True when the sort control should be rendered (whenever sortable fields exist; layout-independent).
 * @property {boolean} canShowMobileSorter - Deprecated. True when the legacy card-layout-only mobile sorter should be rendered (`!isTable && sortables exist`). Use `canShowSorter`.
 */

/**
 * @typedef {object} ViewListColumnsGroup
 * @property {string[]} columns - Visible column field names (auto-unwrapped ref; v-model compatible).
 * @property {{label: string, value: string}[]} columnOptions - All available columns as label/value pairs for a select input.
 */

/**
 * @typedef {object} ViewListPaginationGroup
 * @property {boolean} computedShowAllPages - True when all pages should be loaded at once.
 * @property {boolean} showingAllPages - Whether the `"all"` page-size option is active (auto-unwrapped ref; driven by `list.listState.perPage`).
 * @property {object|undefined} paginateInfo - Shortcut to `instanceList.state.paginateInfo`; exposes `.totalRecords`, `.perPage`, `.totalPages`.
 */

/**
 * @typedef {object} ViewListFilterGroup
 * @property {string[]} filterables - Resolved filterable field names (model config merged with the `filterables` option), including fields with no usable filter type or that are server-hidden.
 * @property {{[filterName: string]: import('@vueda/stores/storeModelInfo.js').FilterInfo}} filterableDetails - Resolved per-field filter details.
 * @property {string[]} validFilterables - `filterables` narrowed to fields with a usable, non-hidden filter type; the field list a filter UI should render as addable/editable. A server-hidden field (e.g. the deep-link `id` filter) is excluded here and from `state.addedFilters`, but its URL value still reaches `list.listState.params` -- see `list.listState`.
 * @property {import('vue').UnwrapNestedRefs<{addedFilters: object[]}>} state - Mutable reactive filter state; `addedFilters` is the rich active-filter list and the primary mutation point (`v-model` target for `FilterGroup`, including clearing it). Restored from the URL on load and kept in sync with query parameters, list request parameters, and saved preferences.
 */

/**
 * @typedef {object} ViewListContext
 * @property {import('@vueda/use/useModelConfig.js').ModelConfigState} modelConfig - Model metadata and view config.
 * @property {import('vue').UnwrapNestedRefs<ViewListListGroup>} list - Core list state and computed field data.
 * @property {import('vue').UnwrapNestedRefs<ViewListActionsGroup>} actions - Action buttons and row selection.
 * @property {import('vue').UnwrapNestedRefs<ViewListSearchGroup>} search - Search bar state and helpers.
 * @property {import('vue').UnwrapNestedRefs<ViewListSortGroup>} sort - Sorting and legacy mobile sort shell state.
 * @property {import('vue').UnwrapNestedRefs<ViewListColumnsGroup>} columns - Column visibility state.
 * @property {import('vue').UnwrapNestedRefs<ViewListPaginationGroup>} pagination - Pagination display state.
 * @property {import('vue').UnwrapNestedRefs<ViewListFilterGroup>} filter - Filter state, restoration, and the resolved filterable field set.
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
    listPreferenceStore.init();
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
    const restoreStoredPreferences = isEmpty(route.query);
    const preferenceArgs = () => ({ app: unref(appRef), model: unref(modelRef) });
    const preferenceQueryFrom = (query) => omit(query, [ORDERING_PARAM, ...hiddenFilterKeys.value]);
    const queryWithCurrentSort = (query, sorted) => {
        const nextQuery = { ...query };
        const value = formatSortQuery(sorted);
        if (value) {
            nextQuery[ORDERING_PARAM] = value;
        } else {
            delete nextQuery[ORDERING_PARAM];
        }
        return nextQuery;
    };
    // A sort the reader chose travels; a server default they never touched does not.
    // `sorting.state.sorted` always holds the sort in effect, so the chips and the Reset control
    // still show the default. Only a chosen sort is written to the URL and sent as the ordering
    // param. Sending an untouched default back would replace the ordering the server applies on
    // its own, and the two are not always the same order: a ranked search sorts by relevance while
    // the ordering param is absent, and a default declared as an expression (`Lower("name")`) sorts
    // by that expression rather than by the bare column the metadata reports it under.
    const sortIsChosen = ref(false);
    // What the URL and the list request carry: the reader's sort, or nothing.
    const sentSorted = computed(() => (sortIsChosen.value ? [...sorting.state.sorted] : []));
    // Records a sort along with whether the reader chose it. An empty sort is never a choice: the
    // list already arrives in the server's default order, so a sort that comes out empty means the
    // default, which `defaultSorted` fills in here.
    const applySort = (sanitized, { chosen }) => {
        sortIsChosen.value = chosen && sanitized.length > 0;
        assignReactiveObject(sorting.state.sorted, sanitized.length ? sanitized : defaultSorted.value);
    };
    const sorting = reactive({
        state: {
            sortables: computed(() => modelConfig?.config?.sortables),
            sorted: [],
        },
        updateSorted: (sorted) => {
            const sanitized = sanitizeSortFields(sorted, unref(sorting.state.sortables) || []);
            // An empty sort is not a distinct choice: the list already comes back in the
            // server's default order, so clearing sort chips down to nothing means the
            // same thing as the default, and there is no explicit preference left to store.
            if (sanitized.length) {
                listPreferenceStore.setSorting(preferenceArgs(), sanitized);
            } else {
                listPreferenceStore.clearSorting(preferenceArgs());
            }
            // Route synchronization happens in the combined sort+filter writer below, keyed off
            // `sentSorted` (which this call updates via `applySort`): a route push here, computed
            // independently against `route.query`, is what let a same-tick filter change and sort
            // change each push a query still carrying the other's stale value.
            applySort(sanitized, { chosen: true });
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

    // Seed rows-per-page: a stored preference (when not deep-linked) wins, else the configured
    // default, validated against the offered option list so the displayed value always matches an option.
    const configuredDefaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
    const pageSizeOptionList = options.pageSizeOptions?.length ? options.pageSizeOptions : DEFAULT_PAGE_SIZE_OPTIONS;
    const storedPerPage = restoreStoredPreferences ? listPreferenceStore.getPerPage(preferenceArgs()) : null;
    const seededPerPage = pageSizeOptionList.includes(storedPerPage) ? storedPerPage : configuredDefaultPageSize;

    // "All" is a rows-per-page selection that drives the all-pages fetch path rather than a `ps` value.
    const showingAllPages = ref(seededPerPage === ALL_PAGES);
    const computedShowAllPages = computed(() => showingAllPages.value);

    // The page-size param is framework-managed (seeded here, updated by the perPage watch), so it must
    // survive the consumer-`params` reconciliation below the same way ordering, fields, and expand do.
    const alwaysParamsKeys = [ORDERING_PARAM, FIELDS_PARAM, EXPAND_PARAM, PAGE_SIZE_PARAM];
    const listState = reactive({
        currentPage: 1,
        perPage: seededPerPage,
        search: "",
        params: {
            [ORDERING_PARAM]: sentSorted,
            [FIELDS_PARAM]: calculatedListFields,
            [EXPAND_PARAM]: computed(() => modelConfig.config?.expand),
        },
    });
    // Always send `ps` for a numeric page size so the server's `perPage` response matches the selection.
    if (seededPerPage !== ALL_PAGES) {
        listState.params[PAGE_SIZE_PARAM] = seededPerPage;
    }

    // Filter ownership: this composable is the single owner of rich filter state (`addedFilters`),
    // route restoration, query parameter synchronization, and saved filter preferences.
    // `FilterGroup` is a presentation host: it renders from `addedFilters` and mutates it in place
    // through the add/edit/remove flows, but does not itself watch the route or compute query params.
    // Own the target object directly (rather than the default one `useFilterables` would create and
    // wrap in `readonly()`): `restoreFiltersFromQuery`'s watch below deep-watches `filterableDetails`
    // on every route change, and an unnecessary extra proxy layer there scales with field count.
    const filterablesState = reactive({ filterables: [], filterableDetails: {} });
    useFilterables(
        modelConfig,
        reactive({
            filterables: toRef(options, "filterables"),
            filterableDetails: toRef(options, "filterableDetails"),
        }),
        filterablesState,
    );
    // Filterables that resolved to a usable filter type; everything else is skipped. Server-hidden
    // filters (e.g. the auto-injected `id__in` deep-link filter, whose widget is a HiddenInput) are
    // excluded: they are programmatic, not user-entered, and have no mapped input widget, so they
    // must not be restored from the URL as an editable filter. This is passed down to FilterGroup
    // via `filter.validFilterables`, so it isn't recomputed there.
    const validFilterables = computed(() => {
        const filterableDetails = filterablesState.filterableDetails || {};
        return (filterablesState.filterables || []).filter((fieldName) => {
            const detail = filterableDetails[fieldName];
            return detail && detail.typeFilter && !detail.hidden;
        });
    });
    // Server-hidden filterables (e.g. the auto-injected `id__in` deep-link filter) have no
    // editable widget, so their value never enters `addedFilters`; it comes from the URL alone.
    // Read with the same param-key resolution the editable filter form uses, so a hidden filter
    // that declares suffixes resolves to the same keys a visible one does. Independent of whether
    // the URL currently carries a value for a key: used to keep a hidden filterable's keys out of
    // what gets read from or written to the saved filter preference, where a stored key can exist
    // with no matching URL value yet. `rawHiddenFilterParams` below is the value-bearing counterpart.
    const hiddenFilterKeys = computed(() => {
        const filterableDetails = filterablesState.filterableDetails || {};
        return (filterablesState.filterables || [])
            .filter((fieldName) => {
                const detail = filterableDetails[fieldName];
                return detail && detail.typeFilter && detail.hidden;
            })
            .flatMap((fieldName) => {
                const paramKeys = getFilterParams(fieldName, filterableDetails[fieldName]);
                return Array.isArray(paramKeys) ? paramKeys : [paramKeys];
            });
    });
    const rawHiddenFilterParams = computed(() => {
        const params = {};
        for (const key of hiddenFilterKeys.value) {
            const value = route.query[key];
            if (value !== undefined && value !== null && value !== "") {
                params[key] = value;
            }
        }
        return params;
    });
    // A fresh plain object every recomputation of `rawHiddenFilterParams` (any route.query change
    // recomputes it, whether or not a hidden filter's own key is involved), guarded down to a
    // stable reference here so it only actually changes -- and only then triggers the combined
    // watch below -- when a hidden filter's value genuinely changes. Without this guard, an
    // unrelated route.query change (e.g. the ordering param) would still swap in a new
    // reference-unequal-but-content-equal object, spuriously re-running the combined watch and
    // racing its route write against other query-driven watchers (e.g. sort) reading the same tick.
    const hiddenFilterParams = ref({});
    watch(
        rawHiddenFilterParams,
        (newValue) => {
            if (!isEqual(hiddenFilterParams.value, newValue)) {
                hiddenFilterParams.value = newValue;
            }
        },
        { immediate: true },
    );
    // Seeds the initial request with whatever hidden-filter values the mount URL already
    // carries; the combined watch below keeps this synchronized with later URL, sort, and
    // visible-filter changes, including a hidden value dropping out through external navigation.
    if (route.params?.action === VIEW_NAME) {
        Object.assign(listState.params, hiddenFilterParams.value);
    }

    const addedFilters = ref([]);
    // A fresh plain object every recomputation, driven by whatever `addedFilters` fields the
    // reader has touched. Reusing it as a watch source (rather than the deep-watched `addedFilters`
    // ref itself) means the watcher below gets genuinely distinct old/new snapshots to compare,
    // without a manual `cloneDeep`.
    const filterParams = computed(() => filtersToParams(addedFilters.value));

    // The single writer for the three constraints useViewList owns end-to-end -- the chosen sort,
    // the active filters, and the search term -- to list parameters, URL state, and saved filter
    // preferences. All three are read here from their own reactive state (`sentSorted`,
    // `filterParams`, `listState.search`) rather than each being pushed independently against
    // `route.query`: since Vue batches synchronous reactive changes into one flush, e.g. a sort
    // clear and a filter clear landing in the same tick are combined into exactly one push instead
    // of separate writes racing to patch the same not-yet-applied query.
    watch(
        [sentSorted, filterParams, toRef(listState, "search"), hiddenFilterParams],
        ([newSorted, newFilterParams, newSearch], oldValues) => {
            const [oldSorted, oldFilterParams, oldSearch] = oldValues || [];
            // Filter-derived effects -- the reset to page 1 and this change's contribution to
            // `listState.params` -- apply only while this is the active list view, matching this
            // composable's original filter-write behavior: a `ViewList` instance kept mounted
            // off-screen (e.g. mid route transition) must not touch the live route or preferences
            // on a stray filter mutation. Sort and search changes have always pushed regardless of
            // the active view, so neither is gated here.
            const onListView = route.params?.action === VIEW_NAME;
            const filtersChanged = onListView && !isEqual(newFilterParams, oldFilterParams);
            const searchChanged = !isEqual(newSearch, oldSearch);
            if (filtersChanged) {
                listState.currentPage = 1;
            }
            if (onListView) {
                // Hidden filter values ride along on every write here rather than through their own
                // preserved key: sourced from the URL alone, they need no query-side reconciliation
                // (they already are the URL), only carrying forward into the request whenever this
                // merge runs -- including when they alone changed, e.g. external navigation.
                assignReactiveObject(listState.params, { ...newFilterParams, ...hiddenFilterParams.value }, [
                    ...Object.keys(options.params || {}),
                    ...alwaysParamsKeys,
                    SEARCH_PARAM,
                ]);
            }
            // Start from the current route so keys none of sort/filters/search own (any foreign
            // query param) pass through untouched. Each domain deletes only the key(s) it
            // previously wrote, then sets whatever it currently owns -- a sort with nothing
            // chosen yet (e.g. while restoration is still waiting on model metadata) is
            // therefore indistinguishable from a foreign key and never gets touched.
            const routeQuery = { ...route.query };
            if (oldSorted?.length) {
                delete routeQuery[ORDERING_PARAM];
            }
            const sortValue = formatSortQuery(newSorted);
            if (sortValue) {
                routeQuery[ORDERING_PARAM] = sortValue;
            }
            if (newSearch) {
                routeQuery[SEARCH_PARAM] = newSearch;
            } else {
                delete routeQuery[SEARCH_PARAM];
            }
            if (onListView) {
                for (const key of Object.keys(oldFilterParams || {})) {
                    delete routeQuery[key];
                }
                Object.assign(routeQuery, newFilterParams);
            }
            if (!isEqual(routeQuery, route.query)) {
                // Dropped while model metadata is still loading: `preferenceQueryFrom`
                // needs `hiddenFilterKeys` to know which query keys a hidden filterable owns, and
                // that list is empty until metadata resolves. Saving before then would store a
                // hidden filterable's value (still present in `routeQuery` from the mount URL) as if
                // it were a reader-chosen filter or search term.
                if ((filtersChanged || searchChanged) && modelConfig.loading === false) {
                    listPreferenceStore.setFilters(preferenceArgs(), preferenceQueryFrom(routeQuery));
                }
                router.push({ query: routeQuery });
            }
        },
    );

    // Rebuild the active-filter list from the URL on load and whenever the query changes externally
    // (e.g. browser navigation). Guarded so filters already applied in-memory, which carry richer
    // values than the URL (e.g. resolved choice objects), are not flattened back into the URL form.
    const restoreFiltersFromQuery = () => {
        const details = filterablesState.filterableDetails || {};
        const restored = (validFilterables.value || [])
            .map((field) => buildFilterFromQuery(field, details[field], route.query))
            .filter(Boolean);
        if (!isEqual(filtersToParams(restored), filtersToParams(addedFilters.value))) {
            addedFilters.value = restored;
        }
    };
    watch([() => route.query, validFilterables, () => filterablesState.filterableDetails], restoreFiltersFromQuery, {
        immediate: true,
        deep: true,
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
    // Rows-per-page selection: persist it, then either drive the all-pages path ("All") or send `ps`.
    watch(toRef(listState, "perPage"), (newPerPage, oldPerPage) => {
        if (newPerPage === oldPerPage) {
            return;
        }
        listPreferenceStore.setPerPage(preferenceArgs(), newPerPage);
        if (newPerPage === ALL_PAGES) {
            delete listState.params[PAGE_SIZE_PARAM];
            showingAllPages.value = true;
        } else {
            showingAllPages.value = false;
            listState.currentPage = 1;
            listState.params[PAGE_SIZE_PARAM] = newPerPage;
        }
    });
    // Pagination bookkeeping only -- route synchronization for `search` happens in the combined
    // sort+filter+search writer above, keyed off `listState.search` directly.
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
        } else {
            listState.params[SEARCH_PARAM] = newSearch;
        }
    });
    watch(
        [() => route.query, () => modelConfig.loading],
        ([newQuery]) => {
            // Deferred until model metadata resolves (added as a watch source above so this
            // reruns once it does, even if route.query itself stays otherwise unchanged):
            // `hiddenFilterKeys` needs it to know which stored keys a hidden filterable owns, so a
            // stored value could otherwise be restored unfiltered and then read back out through
            // `hiddenFilterParams` as if the mount URL itself had carried it.
            if (!isInitialized.filters && modelConfig.loading === false) {
                isInitialized.filters = true;
                const storedFilters = listPreferenceStore.getFilters(preferenceArgs());
                if (storedFilters && isEmpty(newQuery)) {
                    router.push({ query: omit(storedFilters, hiddenFilterKeys.value) });
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
                ...Object.keys(filtersToParams(addedFilters.value)),
                ...Object.keys(hiddenFilterParams.value),
                ...alwaysParamsKeys,
            ]);
        },
        { deep: true, immediate: true },
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

    // Resolve a type-aware column adapter (and its props) for each display
    // field. ViewList injects these as default `field(<col>)` slot content so
    // columns render through their adapter unless a consumer overrides the slot.
    const columnComponents = computed(() => {
        const resolvedColumns = resolveColumns({
            fields: calculatedDisplayFields.value,
            propComponents: unref(options.columnComponents),
            propProps: unref(options.columnProps),
            configComponents: modelConfig.config?.columnComponents,
            configProps: modelConfig.config?.columnProps,
        });
        for (const resolved of Object.values(resolvedColumns)) {
            resolved.component = markRaw(toRaw(resolved.component));
        }
        return resolvedColumns;
    });
    // Slot names ViewList injects defaults for; excluded from the generic
    // consumer-slot forward loop so an injected default and a forwarded
    // consumer slot never double-render the same column.
    const columnSlots = computed(() => Object.keys(columnComponents.value).map((name) => `field(${name})`));

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
    // The list view's hero action: the one promoted to a filled CTA in the page
    // title. By convention that is `create`; a consumer can override the set via
    // the `primaryActions` prop. Intersected with the rendered targetless set so
    // an override naming an unavailable action is simply inert.
    const primaryActions = computed(() => {
        const candidates = options.primaryActions ?? ["create"];
        return new Set(candidates.filter((name) => targetlessActions.value.has(name)));
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
    // The configured default sort (from `modelConfig.config.sorted`, which is the server's
    // `model_ordering.default` unless a project overrode it), sanitized against the currently
    // sortable fields. This is what the read-out shows whenever the URL carries no sort, because
    // that is exactly the request the server answers with its own default ordering. On first load a
    // stored preference wins over it, since that reflects an explicit prior choice.
    const defaultSorted = computed(() => sanitizeSortFields(modelConfig.config?.sorted || [], sortablesList.value));
    // Layout-independent gate for the sort control: show it whenever the model
    // exposes sortable fields. The control picks its own surface (popover vs
    // drawer) by viewport, so the gate no longer depends on `isTable`.
    const canShowSorter = computed(() => sortablesList.value.length > 0);
    // Deprecated: the card-layout-only gate for the legacy MobileSortComponent.
    // Superseded by `canShowSorter`; retained for back-compat.
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
        [toRef(sorting.state, "sortables"), toRef(modelConfig, "loading"), () => route.query[ORDERING_PARAM]],
        ([sortables, modelConfigLoading, querySorting]) => {
            if (modelConfigLoading !== false || !Array.isArray(sortables)) {
                return;
            }
            if (!isInitialized.sort) {
                isInitialized.sort = true;
                const hasUrlSorting = Object.prototype.hasOwnProperty.call(route.query, ORDERING_PARAM);
                const storedSorting =
                    !hasUrlSorting && restoreStoredPreferences
                        ? listPreferenceStore.getSorting(preferenceArgs())
                        : null;
                const sanitized = sanitizeSortFields(
                    hasUrlSorting ? parseSortQuery(querySorting) : storedSorting || [],
                    sortables,
                );
                // A sort read off the URL or out of the preference store is one the reader
                // chose. One that sanitizes down to nothing is not: an empty sort is not a state
                // distinct from the default, since a request without the ordering param is one
                // the server sorts by its own default anyway.
                applySort(sanitized, { chosen: true });

                if (hasUrlSorting) {
                    const canonicalQuery = queryWithCurrentSort(route.query, sentSorted.value);
                    if (!isEqual(canonicalQuery, route.query)) {
                        router.replace({ query: canonicalQuery });
                    }
                } else if (storedSorting) {
                    // Re-save the sanitized value rather than the sort that ends up applied: if
                    // sanitizing dropped every stored field (none are sortable any more), the
                    // stored preference should be cleared, not replaced with the default.
                    if (!isEqual(sanitized, storedSorting)) {
                        if (sanitized.length) {
                            listPreferenceStore.setSorting(preferenceArgs(), sanitized);
                        } else {
                            listPreferenceStore.clearSorting(preferenceArgs());
                        }
                    }
                    const canonicalQuery = queryWithCurrentSort(
                        {
                            ...omit(listPreferenceStore.getFilters(preferenceArgs()), hiddenFilterKeys.value),
                            ...route.query,
                        },
                        sentSorted.value,
                    );
                    if (!isEqual(canonicalQuery, route.query)) {
                        router.replace({ query: canonicalQuery });
                    }
                } else {
                    // The server-default fallback reaches the sort chips but not the URL, and not
                    // the request: leaving the ordering param off is what lets the server apply
                    // the default it reported, rather than this reading that report back to it.
                    const canonicalQuery = queryWithCurrentSort(route.query, sentSorted.value);
                    if (!isEqual(canonicalQuery, route.query)) {
                        router.replace({ query: canonicalQuery });
                    }
                }
                return;
            }
            // After initialization, keep the active sort synchronized with later
            // query-string changes, including browser navigation. A URL with no sort query (or
            // one that sanitizes down to nothing) resolves to the default every time, so
            // there's nothing to remember between runs: this always re-derives from the
            // current URL and default alone.
            applySort(sanitizeSortFields(parseSortQuery(querySorting), sortables), { chosen: true });
            // Canonicalize the sort that travels, the way every branch of initialization does, so
            // the URL always spells out the sort the request carries. A URL that lost its ordering
            // param falls back to the default, which the chips show and the request omits, so
            // nothing is written back here. Nothing reaches the preference store either: arriving
            // at a URL is not the same as choosing a sort, and `updateSorted` is what records a
            // choice.
            const canonicalQuery = queryWithCurrentSort(route.query, sentSorted.value);
            if (!isEqual(canonicalQuery, route.query)) {
                router.replace({ query: canonicalQuery });
            }
        },
        // No `deep`: this watch only needs to run when `sortables`, `modelConfig.loading`,
        // or `route.query[ORDERING_PARAM]`'s value actually changes. The post-init logic
        // above is idempotent (guarded by `isEqual` checks), so a rerun triggered by an
        // unrelated navigation that leaves all three values unchanged would be a no-op
        // anyway; skipping it outright just avoids the redundant work.
        { immediate: true },
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
            columnComponents,
            columnSlots,
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
            primaryActions,
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
            defaultSorted,
            isTable,
            mobileSortDrawerVisible,
            canShowSorter,
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
        filter: reactive({
            filterables: computed(() => filterablesState.filterables),
            filterableDetails: computed(() => filterablesState.filterableDetails),
            validFilterables,
            state: {
                addedFilters,
            },
        }),
    };
}
