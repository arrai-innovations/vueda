/**
 * @module utils/unifiedGet
 * @description Retrieves a value from a plain, related, or calculated object based on a namespaced field path.
 */
import get from "lodash-es/get.js";

/**
 * Retrieves a value from a plain, related, or calculated object based on a namespaced field path.
 * Paths prefixed with "related." or "calculated." are resolved against the corresponding object.
 *
 * @param {object} obj - The primary object.
 * @param {object} relatedObj - The related object.
 * @param {object} calculatedObj - The calculated object.
 * @param {string} fieldPath - The field path, optionally prefixed with "related." or "calculated.".
 * @returns {unknown} The resolved value.
 */
export const unifiedGet = (obj, relatedObj, calculatedObj, fieldPath) => {
    // related. and calculated. are prefixes to the field name, which change the object we're getting from
    if (fieldPath.startsWith("related.")) {
        return get(relatedObj, fieldPath.replace("related.", ""));
    }
    if (fieldPath.startsWith("calculated.")) {
        return get(calculatedObj, fieldPath.replace("calculated.", ""));
    }
    return get(obj, fieldPath);
};
