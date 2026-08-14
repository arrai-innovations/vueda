/**
 * @module use/useComboboxSearch
 * @description Manages state and data-fetching for an API-backed combobox widget.
 * Supports debounced search, pagination, and grouping. Does not handle static option
 * arrays; for those, filter locally in the widget via Reka UI's built-in filtering.
 */
import { deepUnref, loadingCombine, useList } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { useResolvedLookupObject } from "@vueda/use/useResolvedLookupObject.js";
import {
    EXPAND_PARAM,
    FIELDS_PARAM,
    ORDERING_PARAM,
    PAGE_PARAM,
    PAGE_SIZE_PARAM,
    SEARCH_PARAM,
} from "@vueda/utils/constants.js";
import { allPagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import debounce from "lodash-es/debounce.js";
import get from "lodash-es/get.js";
import IsEmpty from "lodash-es/isEmpty.js";
import isEqual from "lodash-es/isEqual.js";
import { computed, reactive, readonly, ref, toRef, unref, watch } from "vue";

/**
 * Groups an array of objects by a key field into `{ [key]: value, items: [] }` buckets.
 *
 * @param {object[]} objects
 * @param {string} groupKey
 * @returns {{ [key: string]: any, items: object[] }[]}
 */
function groupByField(objects, groupKey) {
    const grouped = [];
    for (const item of objects) {
        const key = get(item, groupKey);
        let group = grouped.find((g) => g[groupKey] === key);
        if (!group) {
            group = { [groupKey]: key, items: [] };
            grouped.push(group);
        }
        group.items.push(item);
    }
    return grouped;
}

/**
 * @typedef {object} ComboboxSearchRawProps
 * @property {string} app - Django app label for the model to search.
 * @property {string} model - Django model name.
 * @property {string[]} modelFields - Additional fields to fetch alongside the label and PK.
 * @property {string[]} modelExpandFields - Fields to expand in the fetch.
 * @property {string[]} modelOrdering - Default ordering for the list.
 * @property {string} optionLabel - Field name to display as the option label in the search list.
 * @property {string} selectedOptionLabel - Field name for the closed-state display label.
 * @property {string} [placeholder] - Placeholder text.
 * @property {{ [key: string]: unknown }} extraParams - Extra query parameters merged into every API request.
 * @property {function} [getExtraParams] - Function returning additional parameters from dependency values.
 * @property {boolean} grouped - Whether to group options by a field.
 * @property {string} [groupBy] - Field name to group options by. Requires `grouped: true`.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<ComboboxSearchRawProps>} ComboboxSearchProps
 */

/**
 * @typedef {object} ComboboxSearchRaw
 * @property {boolean} loading - Whether a fetch is in progress.
 * @property {readonly object[]} options - Current options to render (search results or the resolved selected value).
 * @property {import('vue').ComputedRef<string>} optionLabel - The label field name.
 * @property {import('vue').ComputedRef<string>} optionValue - The value field name (model PK).
 * @property {import('vue').ComputedRef<string>} placeholder - Effective placeholder text.
 * @property {import('vue').Ref<string>} query - Search term; bind to ComboboxInput v-model.
 * @property {import('vue').ComputedRef<string>} singleSelectedLabel - Display label for a single selected value (closed state).
 * @property {import('vue').ComputedRef<string>} emptyMessage - Text shown when no options match.
 * @property {import('vue').ComputedRef<boolean>} isGrouped - Whether options are returned as group buckets.
 * @property {import('vue').ComputedRef<string|undefined>} groupByField - The field used for grouping headings.
 * @property {function(): void} onOpen - Call when the combobox opens.
 * @property {function(): void} onClose - Call when the combobox closes.
 */

/**
 * @typedef {import('vue').Reactive<ComboboxSearchRaw>} ComboboxSearch
 */

/**
 * Manages reactive state and API data-fetching for a combobox widget backed by a vueda model endpoint.
 * Only call this composable when `app` and `model` props are present.
 *
 * @param {ComboboxSearchProps} props - Component props containing app, model, and search configuration.
 * @param {import('@vueda/use/useWidget.js').WidgetContext} widgetContext - The widget context.
 * @returns {ComboboxSearch} Reactive search state.
 */
export function useComboboxSearch(props, widgetContext) {
    const hasBeenFocused = ref(false);
    const isOpen = ref(false);
    const query = ref("");
    const bouncedQuery = ref("");

    const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), "list");
    const pkKey = computed(() => modelConfig.info?.pk ?? "id");
    const defaultFields = computed(() => modelConfig.config?.fetchFields || []);
    const defaultExpand = computed(() => modelConfig.config?.expand || []);

    const fieldsList = computed(() => {
        const label = props.selectedOptionLabel ?? props.optionLabel;
        const group = props.grouped ? props.groupBy : undefined;
        const explicit = props.modelFields?.length ? props.modelFields : undefined;
        const base = new Set([unref(pkKey), label, group].filter(Boolean));
        return Array.from(new Set([...(explicit || unref(defaultFields)), ...base]));
    });

    const expandList = computed(() =>
        props.modelExpandFields?.length ? props.modelExpandFields : unref(defaultExpand),
    );
    const orderingList = computed(() => (props.modelOrdering?.length ? props.modelOrdering : undefined));

    const selectedLookup = useResolvedLookupObject(
        toRef(props, "app"),
        toRef(props, "model"),
        toRef(widgetContext.state, "combinedValue"),
        toRef(fieldsList),
        toRef(expandList),
    );

    const effectiveSearch = computed(() => {
        if (!bouncedQuery.value) {
            return "";
        }
        // Avoid triggering an API search when the query still matches the current resolved label.
        if (bouncedQuery.value === returnObject.singleSelectedLabel) {
            return "";
        }
        return bouncedQuery.value;
    });

    const extraParams = computed(() => {
        const base = props.getExtraParams ? props.getExtraParams(widgetContext.state.dependencyValues) : {};
        return { ...base, ...props.extraParams };
    });

    const criticalSearchParams = computed(() => ({
        [SEARCH_PARAM]: effectiveSearch.value,
        [FIELDS_PARAM]: fieldsList.value,
        [EXPAND_PARAM]: expandList.value,
        [ORDERING_PARAM]: orderingList.value,
        ...extraParams.value,
    }));

    const fullSearchParams = computed(() => ({
        ...criticalSearchParams.value,
        [PAGE_PARAM]: 1,
        [PAGE_SIZE_PARAM]: 200,
    }));

    const hasValue = computed(() => {
        const val = widgetContext.state.combinedValue;
        if (Array.isArray(val)) return val.length > 0;
        return val != null && val !== "";
    });

    const intendToSearch = computed(
        () =>
            ((modelConfig.loading === false &&
                (!hasValue.value || (hasValue.value && bouncedQuery.value.length === 0 && isOpen.value))) ||
                effectiveSearch.value.length > 0) &&
            hasBeenFocused.value,
    );

    const searchList = useList({
        props: reactive({
            target: {
                app: toRef(props, "app"),
                model: toRef(props, "model"),
            },
            pkKey,
            params: fullSearchParams,
            intendToList: intendToSearch,
        }),
        handlers: {
            list: allPagePaginatedListCrudAdaptor,
        },
    });

    watch(intendToSearch, (val) => {
        if (val) {
            searchList.clearList();
        }
    });

    watch(
        () => deepUnref(criticalSearchParams),
        (newParams, oldParams) => {
            if (!isEqual(newParams, oldParams)) {
                searchList.clearList();
            }
        },
        { deep: true },
    );

    watch(
        query,
        debounce(
            (val) => {
                if (bouncedQuery.value !== val) {
                    bouncedQuery.value = val;
                }
            },
            500,
            { leading: true },
        ),
    );

    const listObjects = computed(() => {
        const objects = deepUnref(searchList.state.objectsInOrder);
        if (props.grouped && props.groupBy) {
            return groupByField(objects, props.groupBy);
        }
        return objects;
    });

    const computedOptions = computed(() => {
        if (intendToSearch.value && !searchList.state.loading) {
            return readonly(listObjects.value);
        }
        if (hasValue.value && !selectedLookup.loading) {
            return readonly([selectedLookup.object].filter((o) => !IsEmpty(o)));
        }
        return readonly([]);
    });

    const singleSelectedLabel = computed(() => {
        if (selectedLookup.loading === undefined || selectedLookup.loading === true) {
            return "\u00A0";
        }
        return get(selectedLookup.object, props.selectedOptionLabel) ?? widgetContext.state.combinedValue ?? "\u00A0";
    });

    const emptyMessage = computed(() => {
        if (searchList.state.loading) return "Loading...";
        if (!query.value) return "Type to search for results.";
        return "No matching results.";
    });

    /** @type {ComboboxSearch} */
    const returnObject = reactive({
        loading: computed(() => loadingCombine(selectedLookup.loading, searchList.state.loading)),
        options: computed(() => unref(computedOptions)),
        optionLabel: computed(() => props.optionLabel),
        optionValue: computed(() => unref(pkKey)),
        placeholder: computed(() => props.placeholder || `Select a ${props.model}`),
        query,
        singleSelectedLabel,
        emptyMessage,
        isGrouped: computed(() => !!(props.grouped && props.groupBy)),
        groupByField: computed(() => (props.grouped ? props.groupBy : undefined)),
        onOpen: () => {
            if (!hasBeenFocused.value) {
                hasBeenFocused.value = true;
            }
            isOpen.value = true;
        },
        onClose: () => {
            isOpen.value = false;
            query.value = "";
        },
    });
    return returnObject;
}
