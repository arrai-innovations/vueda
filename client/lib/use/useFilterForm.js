/**
 * @module use/useFilterForm
 * @description Manages reactive filter form values, translating field-type-specific initial values and range fields into URL-ready query parameters.
 */
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { FilterFieldMappings } from "@vueda/utils/fieldMappings.js";
import isEmpty from "lodash-es/isEmpty.js";
import isObject from "lodash-es/isObject.js";
import omit from "lodash-es/omit.js";
import { reactive, readonly, toRef, watch } from "vue";

/**
 * @typedef {object} UseFilterFieldProps
 * @property {string} filterName - The name for the filter.
 * @property {{[filterName: string]: import('@vueda/stores/storeModelInfo.js').FilterInfo}} filterableDetails - each available filter details, by filter name
 */

/**
 * @typedef {object} UseFilterFieldRawState
 * @property {{[fieldName: string]: any}} initialValues - The form's initial values
 * @property {boolean} array - Indicates if the filter is an array type.
 * @property {boolean} range - Indicates if the filter is a range type.
 */
/**
 *
 * A Vue composable that creates reactive state for a single filter field based on its type definition.
 * It determines the field's default value and any extra filter configuration (like whether it's a range or an array),
 *
 * @param {UseFilterFieldProps} props - Props that include the filter name and filter metadata.
 * @returns {Readonly<UseFilterFieldRawState>} - A readonly reactive object containing the initial values and filter configuration.
 */
export function useFilterField(props, queryValue) {
    const state = reactive(
        /** @type {UseFilterFieldRawState} */ {
            array: false,
            range: false,
            initialValues: {},
        },
    );

    watch(
        [toRef(props, "filterDetails"), () => queryValue.value],
        ([newFilterDetails, newQueryValue]) => {
            if (!newFilterDetails || isEmpty(newFilterDetails)) {
                return;
            }
            const newInitialValue = {};
            const obj = FilterFieldMappings[newFilterDetails?.typeFilter];
            if (!obj) {
                throw new Error(`${props.filterName}: Missing mapping for filter type ${newFilterDetails?.typeFilter}`);
            }
            if (newQueryValue) {
                if (obj.array && !Array.isArray(newQueryValue)) {
                    newInitialValue[props.filterName] = [newQueryValue];
                } else {
                    newInitialValue[props.filterName] = newQueryValue;
                }
            } else if (obj?.range && newFilterDetails.suffixes?.length === 2) {
                newInitialValue[props.filterName] = {
                    [newFilterDetails.suffixes[0]]: null,
                    [newFilterDetails.suffixes[1]]: null,
                };
            } else {
                newInitialValue[props.filterName] = obj?.initialValue;
            }

            assignReactiveObject(state, {
                initialValues: newInitialValue,
                ...omit(obj, ["initialValue"]),
            });
        },
        { immediate: true, deep: true },
    );
    return readonly(state);
}

/**
 * Whether a filter renders as a range: its value mapping is a range and its
 * metadata declares the two boundary suffixes. The value mapping is the
 * authority, so a custom range type registered through `mergeFilterFieldMapping`
 * with `range: true` is a range whatever its type is named.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo} filterDetails - The filter configuration.
 * @returns {boolean}
 */
export function isRangeFilter(filterDetails) {
    return !!FilterFieldMappings[filterDetails?.typeFilter]?.range && filterDetails?.suffixes?.length === 2;
}

/**
 * Resolve the URL query-param key(s) a filter writes to. A filter that declares
 * suffixes (e.g. a range with `min`/`max`) writes one `${filterName}_${suffix}`
 * key per suffix; otherwise it writes the bare filter name. Mirrors the
 * `lookupExpressionsToParams` computed used by the live filter form so the
 * params produced by adding a filter and the params parsed back out of the URL
 * agree.
 *
 * @param {string} filterName - The filter field name.
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo} filterDetails - The filter configuration.
 * @returns {string|string[]} The bare filter name, or an array of suffixed keys.
 */
export function getFilterParams(filterName, filterDetails) {
    if (filterDetails?.suffixes?.length) {
        return filterDetails.suffixes.map((suffix) => `${filterName}_${suffix}`);
    }
    return filterName;
}

/**
 * Read a filter's active value out of a URL query object, in the shape the
 * filter form submits: a `{ [suffix]: value }` object for suffix/range filters,
 * or the bare param value otherwise. Only present (non-empty) suffix keys are
 * included.
 *
 * @param {string} filterName - The filter field name.
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo} filterDetails - The filter configuration.
 * @param {{[key: string]: any}} query - The URL query object.
 * @returns {any} The filter value, or `undefined` when absent.
 */
export function getFilterQueryValue(filterName, filterDetails, query) {
    if (!query) {
        return undefined;
    }
    const paramKeys = getFilterParams(filterName, filterDetails);
    if (Array.isArray(paramKeys)) {
        return paramKeys.reduce((acc, key) => {
            const value = query[key];
            if (value !== undefined && value !== null && value !== "") {
                const parts = key.split("_");
                acc[parts[parts.length - 1]] = value;
            }
            return acc;
        }, {});
    }
    return query[paramKeys];
}

/**
 * Reduce an active-filter list to the flat query-param object the URL and list
 * request carry. Handles suffix-derived keys (a range filter writes one entry
 * per suffix) and raw-object values (a choice widget's `{ value, label }`
 * shape collapses to its `value`).
 *
 * @param {{field: string, param: string|string[], value: any, isValueRawObject?: boolean}[]} filters - The active filter list.
 * @returns {{[key: string]: any}} The flat query-param object.
 */
export function filtersToParams(filters) {
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
}

/**
 * Build an active-filter object from a URL query, or `null` when the field has
 * no value in the query. The returned shape matches what the filter form
 * applies (`{ field, expression, param, value, range }`), so feeding it through
 * `filtersToParams` and then `useViewList`'s addedFilters→params watch
 * round-trips back to the same query. Array filters coerce a single query
 * value to a one-element array, and range filters keep the `{ [suffix]: value }`
 * object shape.
 *
 * @param {string} filterName - The filter field name.
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo} filterDetails - The filter configuration.
 * @param {{[key: string]: any}} query - The URL query object.
 * @returns {{field: string, expression: string|undefined, param: string|string[], value: any, range: boolean}|null}
 */
export function buildFilterFromQuery(filterName, filterDetails, query) {
    if (!filterDetails || !filterDetails.typeFilter) {
        return null;
    }
    const mapping = FilterFieldMappings[filterDetails.typeFilter];
    if (!mapping) {
        return null;
    }
    const rawValue = getFilterQueryValue(filterName, filterDetails, query);
    const isEmptyRange =
        mapping.range &&
        isObject(rawValue) &&
        Object.values(rawValue).every((v) => v === undefined || v === null || v === "");
    if (
        rawValue === undefined ||
        rawValue === null ||
        rawValue === "" ||
        (Array.isArray(rawValue) && rawValue.length === 0) ||
        isEmptyRange
    ) {
        return null;
    }
    let value = rawValue;
    if (mapping.array && !Array.isArray(value)) {
        value = [value];
    }
    return {
        field: filterName,
        expression: filterDetails.ignorelookupExprs ? undefined : filterDetails.lookupExprs?.[0],
        param: getFilterParams(filterName, filterDetails),
        value,
        range: !!mapping.range,
    };
}
