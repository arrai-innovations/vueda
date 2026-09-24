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
import { getMissingFilterInputSupport } from "@vueda/use/useFilter.js";
import { buildFilterFromQuery, filtersToParams, getFilterParams } from "@vueda/use/useFilterForm.js";
import { useFilterables } from "@vueda/use/useFilterables.js";
import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { useLookupContext } from "@vueda/use/useLookupContext.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { memoizedStartCase } from "@vueda/utils/case.js";
import {
    ALL_PAGES,
    COLUMN_TOTALS_PARAM,
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
import { useBreakpoints } from "@vueuse/core";
import isEmpty from "lodash-es/isEmpty.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, inject, markRaw, nextTick, reactive, ref, toRaw, toRef, unref, watch } from "vue";
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
 * @property {import('vue').Ref<string[]> | string[]} [listFields] - Field names to fetch; uses the `displayFields` keys, then the model config default, when empty.
 * @property {import('vue').Ref<{[key: string]: object}> | {[key: string]: object}} [displayFields] - Display field overrides; uses the model config default when empty.
 * @property {import('vue').Ref<object[]> | object[]} [extraFieldObjects] - Synthetic field objects prepended to the display field list (e.g. the `selected_` checkbox column).
 * @property {import('vue').Ref<{[name:string]: any}> | {[name:string]: any}} [columnComponents] - Per-field column adapter overrides (component, `() => component`, or a string key into `availableColumns`); highest-precedence non-slot override.
 * @property {import('vue').Ref<{[name:string]: object}> | {[name:string]: object}} [columnProps] - Per-field prop overrides forwarded to the resolved column adapter.
 *
 * Data fetching.
 * @property {import('vue').Ref<object> | object} [relatedObjectsRules] - Rules for fetching related objects alongside each row.
 * @property {import('vue').Ref<object> | object} [calculatedObjectsRules] - Rules for deriving calculated objects alongside each row.
 * @property {import('vue').Ref<object> | object} [params] - Extra query parameters merged into every API request.
 * @property {import('vue').Ref<{[paramsKey: string]: ViewListScopeDeclaration}> | {[paramsKey: string]: ViewListScopeDeclaration}} [scopes] - Declares which `params` keys the reader sees as scopes in the constraints band, keyed by `params` key. A declared key that names a filter in the resolved filterables owns that filter's query keys, including suffixed keys. A scope is shown while `params` carries a value for any key it owns. Undeclared `params` keys stay plain request parameters, including keys that name hidden filters.
 *
 * Filter configuration.
 * @property {import('vue').Ref<string[]> | string[]} [filterables] - Field names to show as filters; overrides the model config's declared list when set.
 * @property {import('vue').Ref<object> | object} [filterableDetails] - Per-field filter detail overrides merged with the model config's declared details.
 *
 * Pagination behaviour.
 * @property {(number|string)} [defaultPageSize] - Initial rows-per-page when no preference is stored (a number, or `"all"`). Defaults to `DEFAULT_PAGE_SIZE`.
 * @property {(number|string)[]} [pageSizeOptions] - Rows-per-page options offered by the footer; the final `"all"` entry loads every page. Defaults to `DEFAULT_PAGE_SIZE_OPTIONS`.
 *
 * Layout.
 * @property {import('vue').Ref<string> | string} [tableBreakpoint] - Breakpoint at which the grid switches from cards to a table, matching `ObjectsGrid`'s prop of the same name. Defaults to `"lg"`; `"xs"` is always table. Read reactively, and answers `sort.isTable` until an `ObjectsGrid` reports its own layout — so the first list request knows whether the totals footer will be rendered, without waiting for the grid to mount.
 *
 * Action styling.
 * @property {import('vue').Ref<string[]> | string[]} [primaryActions] - Targetless action names promoted to the filled hero CTA; defaults to `["create"]`.
 */

/**
 * @typedef {object} ViewListScopeDeclaration
 * @property {string} [label] - Readable description shown on the scope chip, such as "2 selected records" or a batch name. Defaults to the filter's metadata label (or the `params` key) with its value, or with a value count when it has several.
 * @property {boolean} [clearable] - When false, the chip has no clear control and Clear scopes leaves the scope in place. Defaults to true.
 */

/**
 * @typedef {object} ViewListScope
 * @property {string} name - A hidden filter's name (`source: "url"`) or a declared `params` key (`source: "params"`).
 * @property {string} label - Readable description shown on the scope chip.
 * @property {string[]} keys - The query keys (`"url"`) or `params` keys (`"params"`) the scope owns.
 * @property {"url"|"params"} source - Where the scope's values come from, which decides who clears it: `useViewList` removes a URL scope's query keys; the caller removes a params scope's keys from `params`.
 * @property {boolean} clearable - Whether the reader can clear the scope. Always true for a URL scope; a params scope's declaration can set it to false.
 */

/**
 * @typedef {object} ViewListListGroup
 * @property {object} instanceList - The `useList` result; exposes `.state.objectsInOrder`, `.state.relatedObjects`, `.state.calculatedObjects`, `.state.loading`, `.state.error`, `.state.paginateInfo`, etc.
 * @property {import('vue').UnwrapNestedRefs<{currentPage: number, perPage: (number|string), search: string, params: object}>} listState - Mutable reactive list state; `currentPage` and `perPage` are the primary mutation points. See `filter.state.addedFilters` for filter state. `listState.params` also carries a server-hidden filter's URL value (e.g. the deep-link `id` filter), sourced from the URL rather than `addedFilters`, and stays present across visible-filter, sort, and search changes until the URL itself drops it (for example through `scope.clearUrlScopes`).
 * @property {string} pkKey - The primary key field name (auto-unwrapped).
 * @property {object[]} computedFieldObjects - Ordered field descriptors for the grid, with column visibility applied.
 * @property {string[]} specialSlots - Slot name strings for extra field objects (e.g. `"field(selected_)"`); used to exclude them from generic slot forwarding.
 * @property {{[name:string]: import('@vueda/utils/resolveColumnComponents.js').ResolvedColumn}} columnComponents - Per-display-field resolved column adapter `{ component, props }`, applying the override precedence chain. ViewList injects these as default `field(<col>)` slot content.
 * @property {string[]} columnSlots - `field(<col>)` slot names for resolved columns; excluded from the generic consumer-slot forward loop to avoid double-rendering.
 * @property {object} columnTotals - Map of display column name to that column's total, for the totals this request asked for. Totals are opt-in: the request carries the intersection of the totals the server advertises (`modelConfig.config.totalables`) and the currently visible columns, under `COLUMN_TOTALS_PARAM`, so hiding the last totalled column stops asking for totals at all and this is `{}`. The server computes them during the same list request that returns the rows, and each response replaces this map rather than merging into it, so a total is always as fresh as the rows beside it and can never describe data that has since changed.
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
 * @property {boolean} isTable - True when the grid is in table mode. Derived from the `tableBreakpoint` option until an `ObjectsGrid` reports its own layout; assigning it (via `@update:is-table`) makes that report the answer from then on.
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
 * @property {string[]} validFilterables - `filterables` narrowed to non-hidden fields whose filter type the client can render an editable input for: value handling plus a field component and widget (or, for a range, both boundary components), with the view config's per-field `fieldComponents`/`widgetComponents` overrides counting toward that. This is the field list a filter UI renders as addable/editable. A visible field that fails the check is left out and reported once per list visit through a console warning naming the app, model, and filter; it is not restored from the URL. A server-hidden field (e.g. the deep-link `id` filter) is excluded here and from `state.addedFilters` regardless of input support, but its URL value still reaches `list.listState.params` -- see `list.listState`.
 * @property {import('vue').UnwrapNestedRefs<{addedFilters: object[]}>} state - Mutable reactive filter state; `addedFilters` is the rich active-filter list and the primary mutation point (`v-model` target for `FilterGroup`, including clearing it). Restored from the URL on load and kept in sync with query parameters, list request parameters, and saved preferences.
 */

/**
 * @typedef {object} ViewListScopeGroup
 * @property {ViewListScope[]} scopes - Active scopes, empty until model metadata has loaded: one per server-hidden filter whose query keys carry a value, followed by one per declared `params` key that carries a value. A hidden filter's label is its `filterableDetails` label with its value, or with a value count when it has several; a params scope uses its declared `label`, falling back to the same form (with the key in place of a label when the key is not a filter).
 * @property {(names: string[]) => void} clearUrlScopes - Removes the named URL scopes' query keys from the route in one navigation. The list refetches without those values and resets to page 1; visible filters, sort, search, and other scopes stay in place. Params scopes are cleared by the caller, which owns `params`.
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
 * @property {import('vue').UnwrapNestedRefs<ViewListScopeGroup>} scope - Active scopes and the URL scope clear control.
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

    const resettingTarget = ref(false);
    // Register before metadata and list watchers so no request uses the previous model's state.
    watch([appRef, modelRef], () => resetTarget());
    const modelConfig = useModelConfig(appRef, modelRef, VIEW_NAME);

    if (!inject(LookupContextSymbol, null)) {
        useLookupContext();
    }

    const validAndActive = computed(
        () =>
            !!(
                isActive.value &&
                ownsRoute.value &&
                !resettingTarget.value &&
                unref(appRef) &&
                unref(modelRef) &&
                modelConfig.loading === false
            ),
    );

    const selectedObjects = ref([]);
    const workflow = useWorkflowTransitions(appRef, modelRef, isActive);
    const router = useRouter();
    const route = useRoute();
    // The action router can retain these props while the destination route already owns the URL.
    const ownsRoute = computed(
        () =>
            isActive.value &&
            (!route.params?.app || route.params.app === unref(appRef)) &&
            (!route.params?.model || route.params.model === unref(modelRef)) &&
            (!route.params?.action || route.params.action === VIEW_NAME),
    );
    let restoreStoredPreferences = isEmpty(route.query);
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
            if (!ownsRoute.value) {
                return;
            }
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
        } else if (Object.keys(options.displayFields || {}).length) {
            // Columns passed in directly: the config's list fetch follows the config's own columns,
            // so it can omit one of these.
            fields = Object.keys(options.displayFields);
        } else if (modelConfig.config.fetchFields?.length) {
            fields = [...modelConfig.config.fetchFields];
        }
        const unrefPKKey = unref(pkKey);
        if (!fields.includes(unrefPKKey)) {
            fields.unshift(unrefPKKey);
        }
        if (modelConfig.config.detailLinkField && !fields.includes("available_actions")) {
            fields.push("available_actions");
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

    // The page-size and column-totals params are framework-managed (seeded here, updated by the
    // perPage and totals watches), so they must survive the consumer-`params` reconciliation below
    // the same way ordering, fields, and expand do.
    const alwaysParamsKeys = [ORDERING_PARAM, FIELDS_PARAM, EXPAND_PARAM, PAGE_SIZE_PARAM, COLUMN_TOTALS_PARAM];
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
    // The filters the reader can add and edit: visible filters the client can render an input
    // for. Server-hidden filters (e.g. the auto-injected `id` deep-link filter, an `in`-lookup
    // whose widget is a HiddenInput) are programmatic, not user-entered, so they stay out of the
    // menu and are never restored from the URL as an editable filter; their URL value travels
    // through `hiddenFilterParams` instead. A visible filter whose type lacks value handling or a
    // component (checked against the view config's per-field overrides, so an override can supply
    // what the default mapping lacks) is left out too: offering it would open a form that cannot
    // mount. The developer learns about that through the warning below rather than the reader
    // through a broken input. Passed down to FilterGroup via `filter.validFilterables`, so it
    // isn't recomputed there.
    const visibleFilterSupport = computed(() => {
        const filterableDetails = filterablesState.filterableDetails || {};
        const overrides = {
            fieldComponents: modelConfig.config?.fieldComponents,
            widgetComponents: modelConfig.config?.widgetComponents,
        };
        const supported = [];
        const unsupported = [];
        for (const fieldName of filterablesState.filterables || []) {
            const detail = filterableDetails[fieldName];
            if (!detail || !detail.typeFilter || detail.hidden) {
                continue;
            }
            const missing = getMissingFilterInputSupport(fieldName, detail, overrides);
            if (missing.length) {
                unsupported.push({ fieldName, missing });
            } else {
                supported.push(fieldName);
            }
        }
        return { supported, unsupported };
    });
    const validFilterables = computed(() => visibleFilterSupport.value.supported);
    // One warning per unsupported filter per list visit, keyed by app, model, and filter so the
    // record for one model never silences the same filter name on the next. Watching the target
    // too reruns the check under the new model's name whichever order the metadata and the target
    // change arrive in. `resetTarget` clears the record, so returning to a model is a new visit.
    const warnedUnsupportedFilters = new Set();
    watch(
        [() => visibleFilterSupport.value.unsupported, appRef, modelRef],
        ([unsupported, app, model]) => {
            for (const { fieldName, missing } of unsupported) {
                const key = `${app}.${model}.${fieldName}`;
                if (warnedUnsupportedFilters.has(key)) {
                    continue;
                }
                warnedUnsupportedFilters.add(key);
                console.warn(
                    `Filter "${fieldName}" on ${app}.${model} is not offered in the filter menu and is not ` +
                        `restored from the URL: the client lacks ${missing.join(", ")}. Register the filter ` +
                        `type with mergeFilterFieldMapping, or declare the filter hidden on the server so its ` +
                        `URL value reaches the request without an input.`,
                );
            }
        },
        { immediate: true },
    );
    // Server-hidden filterables (e.g. the auto-injected `id` deep-link filter) have no
    // editable widget, so their value never enters `addedFilters`; it comes from the URL alone.
    // Read with the same param-key resolution the editable filter form uses, so a hidden filter
    // that declares suffixes resolves to the same keys a visible one does. Independent of whether
    // the URL currently carries a value for a key: used to keep a hidden filterable's keys out of
    // what gets read from or written to the saved filter preference, where a stored key can exist
    // with no matching URL value yet. `rawHiddenFilterParams` below is the value-bearing counterpart.
    const hiddenFilterables = computed(() => {
        const filterableDetails = filterablesState.filterableDetails || {};
        return (filterablesState.filterables || [])
            .filter((fieldName) => {
                const detail = filterableDetails[fieldName];
                return detail && detail.typeFilter && detail.hidden;
            })
            .map((fieldName) => {
                const detail = filterableDetails[fieldName];
                const paramKeys = getFilterParams(fieldName, detail);
                return { fieldName, detail, keys: Array.isArray(paramKeys) ? paramKeys : [paramKeys] };
            });
    });
    const hiddenFilterKeys = computed(() => hiddenFilterables.value.flatMap(({ keys }) => keys));
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
        [rawHiddenFilterParams, ownsRoute, appRef, modelRef],
        ([newValue]) => {
            if (ownsRoute.value && !isEqual(hiddenFilterParams.value, newValue)) {
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

    // Scopes: list constraints supplied by a link or by application code, with no editable input.
    // A server-hidden filter with a URL value is a URL scope; a `params` key declared in the
    // `scopes` option, with a value, is a params scope. Both render in the constraints band.
    const hasScopeValue = (value) =>
        value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && !value.length);
    // An `in` lookup carries its values comma-separated in one query value.
    const scopeValues = (detail, keys, source) =>
        keys
            .flatMap((key) => [source?.[key]].flat())
            .filter(hasScopeValue)
            .flatMap((value) => (detail?.lookupExprs?.includes("in") ? String(value).split(",") : [value]))
            .filter(hasScopeValue);
    // The filter's metadata label (or the key, for a `params` key that is not a filter) with its
    // value, or with a value count when it has several.
    const defaultScopeLabel = (name, detail, values) => {
        const label = detail?.label ?? name;
        return values.length === 1 ? `${label} · ${values[0]}` : `${label} · ${values.length} values`;
    };
    const urlScopes = computed(() => {
        const scopes = [];
        for (const { fieldName, detail, keys } of hiddenFilterables.value) {
            const values = scopeValues(detail, keys, hiddenFilterParams.value);
            if (values.length) {
                scopes.push({
                    name: fieldName,
                    label: defaultScopeLabel(fieldName, detail, values),
                    keys,
                    source: "url",
                    clearable: true,
                });
            }
        }
        return scopes;
    });
    const paramsScopes = computed(() => {
        const filterableDetails = filterablesState.filterableDetails || {};
        const scopes = [];
        for (const [name, declaration] of Object.entries(unref(options.scopes) || {})) {
            const detail = filterableDetails[name];
            const paramKeys = detail ? getFilterParams(name, detail) : name;
            const keys = Array.isArray(paramKeys) ? paramKeys : [paramKeys];
            const values = scopeValues(detail, keys, unref(options.params));
            if (values.length) {
                scopes.push({
                    name,
                    label: declaration?.label || defaultScopeLabel(name, detail, values),
                    keys,
                    source: "params",
                    clearable: declaration?.clearable ?? true,
                });
            }
        }
        return scopes;
    });
    // Scopes appear once model metadata has loaded. Their keys and default labels come from
    // `filterableDetails`, so both sources wait for it and appear together, with their final keys
    // and labels, on the same render as the first list request.
    const scopes = computed(() => (modelConfig.loading === false ? [...urlScopes.value, ...paramsScopes.value] : []));
    const clearUrlScopes = (names) => {
        if (!ownsRoute.value) {
            return;
        }
        const keys = scopes.value
            .filter((scope) => scope.source === "url" && names.includes(scope.name))
            .flatMap((scope) => scope.keys);
        if (keys.some((key) => key in route.query)) {
            router.push({ query: omit(route.query, keys) });
        }
    };

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
        ([newSorted, newFilterParams, newSearch, newHiddenFilterParams], oldValues) => {
            if (!ownsRoute.value) {
                return;
            }
            const [oldSorted, oldFilterParams, oldSearch, oldHiddenFilterParams] = oldValues || [];
            // Filter-derived effects -- the reset to page 1 and this change's contribution to
            // `listState.params` -- apply only while this is the active list view, matching this
            // composable's original filter-write behavior: a `ViewList` instance kept mounted
            // off-screen (e.g. mid route transition) must not touch the live route or preferences
            // on a stray filter mutation. The route ownership guard also covers sort and search.
            const onListView = route.params?.action === VIEW_NAME;
            const filtersChanged = onListView && !isEqual(newFilterParams, oldFilterParams);
            const searchChanged = !isEqual(newSearch, oldSearch);
            const scopesChanged = onListView && !isEqual(newHiddenFilterParams, oldHiddenFilterParams);
            if (filtersChanged || scopesChanged) {
                listState.currentPage = 1;
            }
            if (onListView) {
                // Hidden filter values ride along on every write here rather than through their own
                // preserved key: sourced from the URL alone, they need no query-side reconciliation
                // (they already are the URL), only carrying forward into the request whenever this
                // merge runs -- including when they alone changed, e.g. external navigation.
                assignReactiveObject(listState.params, { ...newFilterParams, ...newHiddenFilterParams }, [
                    ...Object.keys(options.params || {}),
                    ...alwaysParamsKeys,
                    SEARCH_PARAM,
                ]);
            }
            if (resettingTarget.value || modelConfig.loading !== false) {
                return;
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
    const restoreFiltersFromQuery = (query = route.query) => {
        if (!ownsRoute.value || modelConfig.loading !== false) {
            return;
        }
        const details = filterablesState.filterableDetails || {};
        const restored = (validFilterables.value || [])
            .map((field) => buildFilterFromQuery(field, details[field], query))
            .filter(Boolean);
        if (!isEqual(filtersToParams(restored), filtersToParams(addedFilters.value))) {
            addedFilters.value = restored;
        }
    };
    watch(
        [
            () => route.query,
            validFilterables,
            () => filterablesState.filterableDetails,
            ownsRoute,
            () => modelConfig.loading,
            appRef,
            modelRef,
        ],
        () => restoreFiltersFromQuery(),
        {
            immediate: true,
            deep: true,
        },
    );

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
        if (newVal !== oldVal && validAndActive.value) {
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
        if (!resettingTarget.value && ownsRoute.value) {
            listPreferenceStore.setPerPage(preferenceArgs(), newPerPage);
        }
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
        [() => route.query, () => modelConfig.loading, ownsRoute, appRef, modelRef],
        ([newQuery]) => {
            if (!ownsRoute.value) {
                return;
            }
            // Deferred until model metadata resolves (added as a watch source above so this
            // reruns once it does, even if route.query itself stays otherwise unchanged):
            // `hiddenFilterKeys` needs it to know which stored keys a hidden filterable owns, so a
            // stored value could otherwise be restored unfiltered and then read back out through
            // `hiddenFilterParams` as if the mount URL itself had carried it.
            if (!isInitialized.filters && modelConfig.loading === false) {
                isInitialized.filters = true;
                const storedFilters = listPreferenceStore.getFilters(preferenceArgs());
                if (storedFilters && isEmpty(newQuery)) {
                    newQuery = omit(storedFilters, hiddenFilterKeys.value);
                    restoreFiltersFromQuery(newQuery);
                    router.push({ query: newQuery });
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

    const columns = ref([]);
    // The columns a reader sees before anyone has chosen any: every display field, minus the ones
    // this reader hid last time, and all of them when hiding would leave nothing to show.
    //
    // The watcher further down seeds `columns` from this, but it cannot run until the model config
    // has arrived, and the first list request is assembled in that same moment. Anything derived
    // from `columns` alone is therefore still empty when that request is built. So this is the
    // shared derivation, and `effectiveColumns` is what the rest of the view reads: the reader's
    // own selection once there is one, and what they are about to be shown until then.
    const defaultVisibleColumns = computed(() => {
        const fieldNames = calculatedDisplayFields.value.map((field) => field?.name);
        if (!fieldNames.length) {
            return [];
        }
        const hiddenSet = new Set(listPreferenceStore.getHiddenColumns(preferenceArgs()) || []);
        const visible = fieldNames.filter((name) => !hiddenSet.has(name));
        return visible.length > 0 ? visible : [...fieldNames];
    });
    const effectiveColumns = computed(() => (isInitialized.columns ? columns.value : defaultVisibleColumns.value));
    // A field's dotted `name` already is the path `unifiedGet` reads the row's value from
    // (`useObjectGridCell` falls back to it whenever a field declares no `value` of its own), so
    // nothing here needs to derive one.
    const computedFieldObjects = computed(() => {
        const result = [];
        for (const field of options.extraFieldObjects || []) {
            result.push(field);
        }
        for (const field of calculatedDisplayFields.value) {
            if (effectiveColumns.value.includes(field.name)) {
                result.push(field);
            }
        }
        return result;
    });
    const specialSlots = computed(() => (options.extraFieldObjects || []).map((field) => `field(${field.name})`));

    // Declared up here rather than beside the other grid state below, because the totals computed
    // that follows reads it and the watch on that computed is `immediate`.
    //
    // Seeded from the same breakpoint `ObjectsGrid` decides its own layout by, not from an assumed
    // table. The grid takes over through `@update:is-table` once it mounts, but that is a tick after
    // the totals parameter is written and the first list request has left. Seeding `true` on a phone
    // meant that request asked for totals the footer would not render, the grid then reported card
    // layout, the parameter was dropped, and the list fetched a second time — one wasted round trip
    // and one wasted aggregation per total, on the narrow viewport least able to afford either.
    // Read reactively rather than once: a consumer may swap `tableBreakpoint` to force a layout
    // (remapping it to "xs" or "inf" is how a layout toggle is built), and a shell that renders no
    // `ObjectsGrid` at all never receives an `@update:is-table` to correct a stale seed with.
    const tableBreakpoint = computed(() => unref(options.tableBreakpoint) || "lg");
    const isTableByBreakpoint = useBreakpoints(breakpointsVueda).greaterOrEqual(tableBreakpoint);
    // What the grid last reported, or `null` while it has reported nothing. The grid is the
    // authority once it mounts -- it may be told a different breakpoint than this composable was --
    // and it re-emits on every change, so the breakpoint below answers only until then.
    const reportedIsTable = ref(null);
    const isTable = computed({
        get: () => reportedIsTable.value ?? (tableBreakpoint.value === "xs" || isTableByBreakpoint.value),
        set: (value) => {
            reportedIsTable.value = value;
        },
    });

    // Column totals are opt-in server-side: a list request that names none gets an empty
    // `columnTotals` back and costs no aggregation query. So ask for the totals the rendered columns
    // can actually show — the footer keys totals by display column name, and a total for a hidden
    // column would be a `SUM` computed for no one. Hiding the last totalled column drops the
    // parameter entirely; showing it again puts it back.
    //
    // Card layout drops the whole set for the same reason: the totals row is a table footer, and
    // `ViewList` renders it only while `isTable`. Below the grid's table breakpoint there is nowhere
    // to put a total, so a phone-width list should not be paying for one. Crossing back over the
    // breakpoint puts the parameter back.
    //
    // Always the whole set, never a delta. The server computes totals from the same queryset that
    // produced the rows in that response, so asking for one more total means re-asking for the ones
    // already shown: the data behind them may have changed since, and a total carried over from an
    // earlier response could describe rows that are no longer on screen.
    const requestedColumnTotals = computed(() => {
        if (!isTable.value) {
            return [];
        }
        const totalables = modelConfig.config?.totalables || [];
        if (!totalables.length) {
            return [];
        }
        const visible = new Set(computedFieldObjects.value.map((field) => field?.name));
        return totalables.filter((name) => visible.has(name));
    });
    watch(
        requestedColumnTotals,
        (requested) => {
            if (!requested.length) {
                delete listState.params[COLUMN_TOTALS_PARAM];
                return;
            }
            // Written only when the names actually differ. The computed hands back a fresh array
            // whenever any column's visibility changes, and assigning an equal-but-new array here
            // would refetch the list for a request that did not change.
            if (!isEqual(listState.params[COLUMN_TOTALS_PARAM], requested)) {
                listState.params[COLUMN_TOTALS_PARAM] = [...requested];
            }
        },
        // Synchronous, so the parameter is in `listState.params` before the list request that should
        // carry it is assembled. The model config arriving is what both fills these names in and
        // lets the first request go out; a queued watcher would write the parameter after that
        // request had already left, and the list would fetch a second time to add it.
        { immediate: true, flush: "sync" },
    );

    // A declared total whose name matches no display column at all is the one misconfiguration the
    // server's `vueda_info.E011` check cannot catch: `column_totals` keys name client columns, and
    // the server has no idea what those are, since `displayFields` is configured per project and per
    // view. Nothing fails for it — the total is simply never requested and never rendered — so this
    // is the only place it can be said out loud.
    //
    // Compared against every configured display column rather than the currently visible ones, so a
    // reader hiding a totalled column is not reported as a misconfiguration.
    let reportedUnmatchedTotals = "";
    watch(
        [() => modelConfig.config?.totalables, calculatedDisplayFields, () => options.extraFieldObjects],
        ([totalables, displayFields, extraFields]) => {
            const columnNames = new Set(
                [...(displayFields || []), ...(extraFields || [])].map((field) => field?.name).filter(Boolean),
            );
            // No columns yet means the model config has not arrived, not that nothing matches.
            if (!columnNames.size) {
                return;
            }
            const unmatched = (totalables || []).filter((name) => !columnNames.has(name));
            const reported = unmatched.join(",");
            if (!unmatched.length) {
                // Cleared rather than left alone, so the same mismatch coming back later is
                // reported again. The sentinel exists to keep one misconfiguration from logging on
                // every column change, not to log it once for the life of the view.
                reportedUnmatchedTotals = "";
                return;
            }
            if (reported === reportedUnmatchedTotals) {
                return;
            }
            reportedUnmatchedTotals = reported;
            console.error(
                `useViewList: ${unref(appRef)}.${unref(modelRef)} advertises column total(s) ` +
                    `${unmatched.join(", ")} matching no display column, so they can never be requested ` +
                    "or rendered. Name each total in the viewset's `column_totals` after the column it " +
                    "belongs under, or add that column to `displayFields`.",
            );
        },
        { immediate: true, deep: true },
    );

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
        [calculatedDisplayFields, () => modelConfig.loading, appRef, modelRef],
        ([newFields], oldValues) => {
            if (modelConfig.loading !== false) {
                return;
            }
            const oldFields = oldValues?.[0] || [];
            if (!isInitialized.columns) {
                // Empty only while there are no display fields yet, which is not a choice to record:
                // leave the flag down so the next fields to arrive still seed the selection.
                if (!defaultVisibleColumns.value.length) {
                    columns.value = [];
                    return;
                }
                columns.value = [...defaultVisibleColumns.value];
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
        [
            toRef(sorting.state, "sortables"),
            toRef(modelConfig, "loading"),
            () => route.query[ORDERING_PARAM],
            ownsRoute,
            appRef,
            modelRef,
        ],
        ([sortables, modelConfigLoading, querySorting]) => {
            if (!ownsRoute.value || modelConfigLoading !== false || !Array.isArray(sortables)) {
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
        // Only metadata, target, ownership, and the ordering query can change the active sort.
        { immediate: true },
    );
    watch(
        columns,
        (newColumns) => {
            if (!isInitialized.columns || resettingTarget.value || !ownsRoute.value || modelConfig.loading !== false) {
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

    const resetTarget = () => {
        resettingTarget.value = true;
        restoreStoredPreferences = isEmpty(route.query);
        isInitialized.sort = false;
        isInitialized.columns = false;
        isInitialized.filters = false;
        warnedUnsupportedFilters.clear();
        selectedObjects.value = [];
        columns.value = [];
        addedFilters.value = [];
        hiddenFilterParams.value = {};
        sortIsChosen.value = false;
        sorting.state.sorted = [];
        mobileSortDrawerVisible.value = false;
        listSearch.value = null;
        listState.search = "";
        listState.currentPage = 1;
        const stored = restoreStoredPreferences ? listPreferenceStore.getPerPage(preferenceArgs()) : null;
        const pageSizes = options.pageSizeOptions?.length ? options.pageSizeOptions : DEFAULT_PAGE_SIZE_OPTIONS;
        listState.perPage = pageSizes.includes(stored) ? stored : (options.defaultPageSize ?? DEFAULT_PAGE_SIZE);
        showingAllPages.value = listState.perPage === ALL_PAGES;
        assignReactiveObject(listState.params, options.params || {}, [ORDERING_PARAM, FIELDS_PARAM, EXPAND_PARAM]);
        if (!showingAllPages.value) {
            listState.params[PAGE_SIZE_PARAM] = listState.perPage;
        }
        instanceList.clearError();
        instanceList.clearList();
        // Let parameter and metadata watchers settle before permitting another list request.
        nextTick(() => {
            resettingTarget.value = false;
        });
    };

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
        scope: reactive({
            scopes,
            clearUrlScopes,
        }),
    };
}
