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
import { allPagePaginatedListCrudAdaptor, singlePagePaginatedListCrudAdaptor } from "@vueda/utils/listCrud.js";
import debounce from "lodash-es/debounce.js";
import get from "lodash-es/get.js";
import IsEmpty from "lodash-es/isEmpty.js";
import isEqual from "lodash-es/isEqual.js";
import { computed, reactive, readonly, ref, toRef, unref, watch } from "vue";

/**
 * @typedef {object} WidgetSearchableSelectRawProps
 * @property {string} app - The app name.
 * @property {string} model - The model name.
 * @property {string[]} modelFields - The fields to include in the model.
 * @property {string[]} modelExpandFields - The fields to expand in the model.
 * @property {string[]} modelOrdering - The ordering of the model.
 * @property {object[]} options - The options to display in the select.
 * @property {string} optionValue - The value field for the options.
 * @property {string} optionLabel - The label field for the options.
 * @property {string} selectedOptionLabel - The label to display when the value is set.
 * @property {boolean} multiple - Whether to allow multiple selections.
 * @property {string} placeholder - The placeholder text for the select.
 * @property {boolean} readonly - Whether the select is readonly.
 * @property {object} extraParams - Extra parameters to pass to the API.
 * @property {function} getExtraParams - A function to get extra parameters.
 * @property {boolean} grouped - Whether to group the options.
 * @property {string} groupBy - The field to group the options by.
 * @property {boolean} isLazy - Whether to load the options lazily.
 */

/**
 * @typedef {import("vue").UnwrapNestedRefs<WidgetSearchableSelectRawProps>} WidgetSearchableSelectProps
 */

export const SEARCHABLE_SELECT_PROPS = {
    app: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    modelFields: {
        type: Array,
        default: () => [],
    },
    modelExpandFields: {
        type: Array,
        default: () => [],
    },
    modelOrdering: {
        type: Array,
        default: () => [],
    },
    optionValue: {
        type: String,
        default: "id",
    },
    optionLabel: {
        type: String,
        default: "formatted_name",
        description: "The label to display when searching.",
    },
    selectedOptionLabel: {
        type: String,
        default: "formatted_name",
        description: "The label to display when the value is set.",
    },
    multiple: {
        type: Boolean,
        default: false,
    },
    placeholder: {
        type: String,
        default: undefined,
    },
    readonly: {
        type: Boolean,
        default: false,
    },
    extraParams: {
        type: Object,
        default: () => ({}),
    },
    getExtraParams: {
        type: Function,
        default: undefined,
    },
    grouped: {
        type: Boolean,
        default: false,
        description:
            "If true, the options will be grouped by the groupBy field. isLazy is assumed to be true when grouped is true.",
    },
    groupBy: {
        type: String,
        default: undefined,
    },
    isLazy: {
        type: Boolean,
        default: false,
    },
};

function groupBy(objects, groupKey) {
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
 * @typedef {object} WidgetSearchableRawState
 */
/**
 * @typedef {import('vue').Reactive<WidgetSearchableRawState>} WidgetSearchableState
 */
/**
 * @typedef {object} WidgetSearchableSelectRaw
 * @property {import('vue').ComputedRef<any>} computedLabel - The label to display when readonly.
 * @property {([options: object]) => [label: string] } lookupGroupBy - The function to get the group by value from an option.
 * @property {function} onBeforeShow - The before-show event for the select.
 * @property {function} onChange - The value-change event for the select.
 * @property {function} onHide - The hide event for the select.
 * @property {import('vue').ComputedRef<any>} emptyMessage - The message to display when there are no options.
 * @property {function} optionGroupChildren - The function to get the group by value from an option.
 * @property {import('vue').ComputedRef<any>} optionLabel - The label field for the options.
 * @property {import('vue').ComputedRef<any>} optionValue - The value field for the options.
 * @property {import('vue').ComputedRef<any>} options - The options to display in the select.
 * @property {import('vue').ComputedRef<any>} placeholder - The placeholder text for the select.
 * @property {import('vue').ComputedRef<any>} query - The search query.
 * @property {import('vue').ComputedRef<any>} selectedLabel - The label of the selected option, to display when closed but not readonly.
 * @property {object} virtualScrollerOptions - The options for the virtual scroller.
 */

/**
 * @typedef {import('vue').Reactive<WidgetSearchableSelectRaw>} WidgetSearchableSelect
 */
/**
 * @param {WidgetSearchableSelectProps} props - The props for the widget searchable select.
 * @param {import('../use/useWidget.js').WidgetContext} widgetContext - The widget context.
 * @param {object} selectRef - The ref for the primevue select component.
 * @returns {WidgetSearchableSelect} - The instance of the widget searchable select.
 */
export function useSearchableSelect(props, widgetContext, selectRef) {
    const lazy = computed(() => props.isLazy && !props.grouped);
    const pageToFetch = ref(1);
    const explicitPerPage = ref(null);
    const hasBeenFocused = ref(false);
    const query = ref("");
    const bouncedQuery = ref("");
    const virtualObjectsInOrder = ref([]);
    const firstVisibleIndex = ref(0);
    const lastVisibleIndex = ref(0);

    const perPage = computed({
        get: () => (props.isLazy ? (explicitPerPage.value ?? 25) : 200),
        set: (val) => {
            explicitPerPage.value = val;
        },
    });

    const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), "list");
    const pkKey = computed(() => modelConfig.info?.pk ?? "id");
    const defaultFields = computed(() => modelConfig.config?.fetchFields || []);
    const defaultExpand = computed(() => modelConfig.config?.expand || []);
    const defaultOrdering = computed(() => undefined); // replace when available

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
    const orderingList = computed(() => (props.modelOrdering?.length ? props.modelOrdering : unref(defaultOrdering)));

    // power the selected option
    const selectedLookup = useResolvedLookupObject(
        toRef(props, "app"),
        toRef(props, "model"),
        toRef(widgetContext.state, "combinedValue"),
        toRef(fieldsList),
        toRef(expandList),
    );

    // Don't immediately search by the label of the current value, even though we put it in the search box for some reason.
    const effectiveSearch = computed(() =>
        bouncedQuery.value && bouncedQuery.value !== returnObject.readonlyLabel ? bouncedQuery.value : "",
    );

    const extraParams = computed(() => {
        const base = props.getExtraParams ? props.getExtraParams(widgetContext.state.dependencyValues) : {};
        return {
            ...base,
            ...props.extraParams,
        };
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
        [PAGE_PARAM]: pageToFetch.value,
        [PAGE_SIZE_PARAM]: perPage.value,
    }));

    const intendToSearch = computed(
        () =>
            ((modelConfig.loading === false && !widgetContext.state.combinedValue) || effectiveSearch.value.length) &&
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
            list: (...args) =>
                lazy.value ? singlePagePaginatedListCrudAdaptor(...args) : allPagePaginatedListCrudAdaptor(...args),
        },
        paged: true,
        keepOldPages: true,
        clearListOnListIntentTriggered: true,
    });

    const listObjects = computed(() => {
        const objects = deepUnref(searchList.state.objectsInOrder);
        if (props.grouped) {
            return groupBy(objects, props.groupBy);
        }
        return objects;
    });

    const computedOptions = computed(() => {
        if (intendToSearch.value && !searchList.state.loading) {
            if (!unref(lazy)) {
                return readonly(listObjects.value);
            }
            return readonly(virtualObjectsInOrder.value);
        }
        if (widgetContext.state.combinedValue && !selectedLookup.loading) {
            return readonly([selectedLookup.object].filter(IsEmpty));
        }
        return readonly([]);
    });

    const resetScroller = () => {
        pageToFetch.value = 1;
        if (lazy.value) {
            virtualObjectsInOrder.value = [];
            firstVisibleIndex.value = 0;
            lastVisibleIndex.value = 0;
        }
        const virtualScrollerRef = selectRef.value?.virtualScroller;
        if (virtualScrollerRef) {
            virtualScrollerRef.scrollTo({ top: 0 });
        }
    };

    watch(
        query,
        debounce(
            (val) => {
                // don't send a search for every keystroke
                if (bouncedQuery.value !== val) {
                    bouncedQuery.value = val;
                }
            },
            500,
            {
                leading: true,
            },
        ),
    );

    watch(
        () => deepUnref(criticalSearchParams),
        (newParams, oldParams) => {
            // if the params change, reset the scroller
            if (!isEqual(newParams, oldParams)) {
                resetScroller();
            }
        },
        { deep: true },
    );

    // HACK: pageToIds will change before searchList.state.objects, due to reactivity indirection
    //       we need to do our own indirection to wait for the objects to be set
    const pageObjects = ref([]);
    watch(
        () => searchList.state.pageToIds,
        (pageToIds) => {
            if (!unref(lazy)) {
                return;
            }
            const page = pageToFetch.value;
            const ids = pageToIds.get(page);
            pageObjects.value.length = 0;
            for (const id of ids) {
                if (!(id in searchList.state.objects)) {
                    searchList.state.objects[id] = {};
                }
                pageObjects.value.push(toRef(searchList.state.objects, id));
            }
        },
        { deep: true },
    );
    let id = 0;
    watch(
        pageObjects,
        (newObjects) => {
            if (!unref(lazy)) {
                return;
            }
            const objectsInOrder = deepUnref(newObjects);
            const total = searchList.state.totalRecords || 0;
            const page = pageToFetch.value;
            const pageSize = perPage.value;
            const startingIndex = (page - 1) * pageSize;
            if (virtualObjectsInOrder.value.length !== total) {
                if (virtualObjectsInOrder.value.length === 0) {
                    // First time: build the array to total size
                    virtualObjectsInOrder.value = Array.from({ length: total }, () => ({
                        [pkKey.value]: ++id,
                        [props.optionLabel]: "loading...",
                        [props.groupBy]: "nothing",
                    }));
                } else if (virtualObjectsInOrder.value.length < total) {
                    // Expand if needed
                    virtualObjectsInOrder.value.length = total;
                }
            }
            if (objectsInOrder?.length) {
                // virtualObjectsInOrder.value.splice(startingIndex, pageSize, ...objectsInOrder);
                for (let i = 0; i < objectsInOrder.length; i++) {
                    const index = startingIndex + i;
                    if (index < total) {
                        Object.assign(virtualObjectsInOrder.value[index], objectsInOrder[i]);
                    }
                }
            }
        },
        { deep: true },
    );

    watch(
        [
            () => searchList.state.totalPages,
            () => searchList.state.perPage,
            () => searchList.state.loading,
            () => firstVisibleIndex.value,
            () => lastVisibleIndex.value,
        ],
        ([totalPages, perPage, loading, first, last]) => {
            if (loading || !totalPages || !perPage) {
                return;
            }
            const pageFrom = Math.floor(first / perPage) + 1;
            const pageTo = Math.floor((last - 1) / perPage) + 1; // minus 1 to make last index inclusive

            for (let page = pageFrom; page <= pageTo; page++) {
                if (!searchList.state.pageToIds.has(page)) {
                    pageToFetch.value = page;
                    break; // fetch one at a time
                }
            }
        },
        { immediate: true },
    );

    const selectedOptionLabel = computed(() => get(selectedLookup.object, props.selectedOptionLabel));

    const emptyMessage = computed(() => {
        if (searchList.state.loading) {
            return "Loading...";
        }
        if (!query.value) {
            return "Type to search for results.";
        }
        return "No matching results.";
    });

    /** @type {WidgetSearchableSelect} */
    const returnObject = reactive({
        loading: computed(() => loadingCombine(selectedLookup.loading, searchList.state.loading)),
        lookupGroupBy: (option) => get(option, props.groupBy), // the label of the selected option, to display when closed but not readonly
        onBeforeShow: () => {
            if (!hasBeenFocused.value) {
                hasBeenFocused.value = true;
            }
        },
        onChange: () => {
            if (!hasBeenFocused.value) {
                hasBeenFocused.value = true;
            }
        },
        onHide: () => {
            query.value = widgetContext.state.combinedValue ? returnObject.readonlyLabel : "";
        },
        emptyMessage,
        optionGroupChildren: computed(() => (props.grouped && intendToSearch ? "items" : undefined)),
        optionLabel: computed(() => props.optionLabel),
        optionValue: computed(() => unref(pkKey)),
        options: computed(() => unref(computedOptions)),
        placeholder: computed(() => props.placeholder || `Select a ${props.model}`),
        query,
        selectedLabel: computed(() => {
            if (selectedLookup.loading === undefined || selectedLookup.loading === true) {
                return "\u00A0";
            }
            return selectedOptionLabel.value ?? widgetContext.state.combinedValue ?? "\u00A0";
        }),
        virtualScrollerOptions: {
            lazy: lazy,
            onLazyLoad: (e) => {
                firstVisibleIndex.value = e.first;
                lastVisibleIndex.value = e.last;
                const newPerPage = Math.max(e.last - e.first, 25);
                if (perPage.value !== newPerPage) {
                    perPage.value = newPerPage;
                }
            },
            itemSize: 38,
            showLoader: true,
            autoSize: true,
        }, // Select's hide event
    });
    return returnObject;
}
