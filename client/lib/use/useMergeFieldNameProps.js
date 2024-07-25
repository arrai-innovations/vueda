import isEqual from "lodash-es/isEqual.js";
import { reactive, readonly, watch } from "vue";

/**
 * Gets the desired prop value for a given prop key from an array of sources.
 *
 * @param {import('vue').WatchSource<{[propName:string]:any}>[]} sources - An array of reactive objects with prop names as keys and values as values.
 * @param {string} fieldName - The field name to get the prop value for.
 * @param {string} propKey - The prop key to get the value for.
 * @returns {any} - The value of the prop key from the sources.
 */
const getDesiredPropValue = (sources, fieldName, propKey) =>
    sources.reduce((acc, source) => {
        if (acc) {
            return acc;
        }
        const sourceOr = source?.[fieldName] || {};
        if (propKey in sourceOr) {
            // falsely values are valid
            return sourceOr[propKey];
        }
        return acc;
    }, undefined);

/**
 * Merges props from multiple sources for a given field name.
 * @param {import('vue').WatchSource<{[fieldName:string]:{[propName:string]:any}}>[]} sources - An array of reactive objects with field names as keys and props as values.
 * @param {string} fieldName - The field name to merge props for.
 * @returns {import('vue').UnwrapNestedRefs<object>} - An object with prop names as keys and values as values.
 */
const mergeProps = (sources, fieldName) => {
    const allPropKeys = sources.reduce((acc, source) => {
        if (!source) {
            return acc;
        }
        return acc.concat(Object.keys(source[fieldName] || {}));
    }, []);

    return allPropKeys.reduce((acc, propKey) => {
        acc[propKey] = getDesiredPropValue(sources, fieldName, propKey);
        return acc;
    }, {});
};

/**
 * Merges props from multiple sources for each field name. The sources are watched for changes.
 * The sources are watched deep, you likely don't want to use this for large churn sources. Intended
 * for low change configuration data.
 *
 * @param {import('vue').WatchSource<{[fieldName:string]:{[propName:string]:any}}>[]} sources - An array of reactive objects with field names as keys and props as values.
 * @returns {Readonly<import('vue').UnwrapNestedRefs<object>>} - A readonly object with field names as keys and props as values.
 */
export function useMergeFieldNameProps(sources) {
    const merged = reactive({});

    watch(
        sources,
        (sourceValues) => {
            const allFieldNames = sourceValues.reduce((acc, sourceValue) => {
                if (!sourceValue) {
                    return acc;
                }
                return acc.concat(Object.keys(sourceValue));
            }, []);

            const desired = allFieldNames.reduce((acc, fieldName) => {
                acc[fieldName] = mergeProps(sourceValues, fieldName);
                return acc;
            }, {});
            if (!isEqual(merged, desired)) {
                Object.assign(merged, desired);
            }
        },
        {
            deep: true,
            immediate: true,
        },
    );
    return readonly(merged);
}
