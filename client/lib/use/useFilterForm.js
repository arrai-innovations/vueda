/**
 * @module use/useFilterForm
 * @description Manages reactive filter form values, translating field-type-specific initial values and range fields into URL-ready query parameters.
 */
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import isEmpty from "lodash-es/isEmpty.js";
import omit from "lodash-es/omit.js";
import { reactive, readonly, toRef, watch } from "vue";

const FilterFieldMappings = {
    DateRangeField: {
        range: true,
        initialValue: {
            start: null, // Default to start and end, being overridden by the suffixes
            end: null,
        },
    },
    CharField: {
        initialValue: "",
    },
    DateField: {
        initialValue: null,
    },
    DateTimeField: {
        initialValue: null,
    },
    IsoDateTimeField: {
        initialValue: null,
    },
    DecimalField: {
        initialValue: null,
    },
    DurationSecondsField: {
        initialValue: null,
    },
    DurationField: {
        initialValue: null,
    },
    FloatField: {
        initialValue: null,
    },
    ChoiceField: {
        initialValue: null,
    },
    ModelMultipleChoiceInField: {
        initialValue: [],
        array: true,
    },
    ModelChoiceInField: {
        initialValue: [],
        array: true,
    },
    ModelChoiceField: {
        initialValue: null,
    },
    BooleanField: {
        initialValue: null,
    },
    NullBooleanField: {
        initialValue: null,
    },
};

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
