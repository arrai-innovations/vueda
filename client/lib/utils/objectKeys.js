/**
 * @module utils/objectKeys
 * @description Reads which field holds a model's object keys, from the model info that the server reports.
 *
 * An object key is the value that identifies one object in a model's detail URLs, client routes, and bulk `pks`
 * bodies: the value of the model's lookup field.
 */

/**
 * Returns the name of the field whose value is each object's key, from the model info's `lookupField`.
 *
 * The name is `"id"` until the model info has loaded. A view builds its object and list instances before then, and
 * those instances need a field name from the start. They read the reported field once the model info arrives.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').ModelInfo|null|undefined} info - The model info.
 * @returns {string} The lookup field name.
 */
export function lookupFieldOf(info) {
    return info?.lookupField ?? "id";
}

/**
 * Returns whether a view can subscribe to live updates of one object of the model.
 *
 * An object subscription names its object by primary key. A view names the object by its object key, so the view can
 * subscribe only when the model's lookup field is its primary key field. The result is false until the model info has
 * loaded.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').ModelInfo|null|undefined} info - The model info.
 * @returns {boolean} Whether the lookup field is the primary key field.
 */
export function objectKeyIsPrimaryKey(info) {
    return !!info?.lookupField && info.lookupField === info.pk;
}
