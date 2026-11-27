/**
 * @module utils/lookupValues
 * @description Reads a model's lookup field from model info, and a row's lookup value.
 *
 * A lookup value is the value of a model's lookup field. It addresses one object in the model's detail URLs and in
 * every client route. The client identifies the object by its primary key in request bodies, workflow requests, and
 * live-update subscriptions.
 */
import { LOOKUP_PARAM } from "@vueda/utils/constants.js";

/**
 * Returns the name of the field whose value addresses each object, from the model info's `lookupField`.
 *
 * The model info reports a `lookupField` only when the model's viewset addresses objects by a field other than the
 * primary key. Otherwise the name is the primary key field. It is `"id"` until the model info has loaded. A view
 * builds its object and list instances before then, and those instances need a field name from the start.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').ModelInfo|null|undefined} info - The model info.
 * @returns {string} The lookup field name.
 */
export function lookupFieldOf(info) {
    return info?.lookupField ?? info?.pk ?? "id";
}

/**
 * Returns whether the model's viewset addresses objects by a custom lookup field, a field other than the primary key.
 *
 * A route of such a model carries lookup values, so a page reads the primary keys that it sends from the rows that it
 * loads. A route of any other model carries the primary keys themselves.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').ModelInfo|null|undefined} info - The model info.
 * @returns {boolean} Whether the model has a custom lookup field.
 */
export function hasCustomLookupField(info) {
    return !!info?.lookupField;
}

/**
 * Returns the list params that load the rows whose lookup values `values` holds.
 *
 * A model with a custom lookup field loads them through the `lookup` filter, which matches that field. A model whose
 * lookup field is its primary key field loads them through the `id` filter, which matches the primary key.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').ModelInfo|null|undefined} info - The model info.
 * @param {unknown[]} values - The lookup values of the rows to load.
 * @returns {{[param: string]: unknown[]}} The list params.
 */
export function lookupValuesListParams(info, values) {
    return hasCustomLookupField(info) ? { [LOOKUP_PARAM]: values } : { id: values };
}

/**
 * Returns the lookup value of `row`: the value that its detail URL and its client routes carry.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').ModelInfo|null|undefined} info - The model info.
 * @param {object|null|undefined} row - The row.
 * @returns {string|number|undefined} The lookup value. It is `undefined` when the row does not carry the field.
 */
export function lookupValueOf(info, row) {
    return row?.[lookupFieldOf(info)];
}

/**
 * Returns the lookup value that a link to a related object's read view carries.
 *
 * An object carries the value under the related model's lookup field. A scalar is a primary key. It is the lookup
 * value only when the related model has no custom lookup field.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').ModelInfo|null|undefined} info - The related model's info.
 * @param {unknown} related - The related object, or its primary key.
 * @returns {unknown} The lookup value. It is `undefined` when the value does not carry it.
 */
export function relatedLookupValueOf(info, related) {
    if (related !== null && typeof related === "object") {
        return lookupValueOf(info, related);
    }
    return hasCustomLookupField(info) ? undefined : related;
}

/**
 * Returns one spelling of a lookup value, so that two spellings of the same key compare equal.
 *
 * A composite key travels as a JSON array string. A route may hold it as `[1, 42]` while the row's value is
 * `["1", "42"]`. Both give `["1","42"]`. Any other value gives its string, because two different strings of a text
 * field, such as `007` and `7`, name two different rows.
 *
 * @param {unknown} value - A lookup value from a route or a row.
 * @returns {string} The comparable spelling.
 */
export function comparableLookupValue(value) {
    if (Array.isArray(value)) {
        return JSON.stringify(value.map(String));
    }
    const text = String(value);
    if (text.startsWith("[")) {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                return JSON.stringify(parsed.map(String));
            }
        } catch {
            // Not JSON: the text itself is the key.
        }
    }
    return text;
}
