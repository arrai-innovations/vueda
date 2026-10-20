/**
 * @module utils/reverseForeignKey
 * @description Identifies a reverse foreign key in model info, which forms show read-only unless the view expands it.
 */

/**
 * Report whether a field is a reverse foreign key, such as an order's `items` when each item has a foreign key to its order.
 *
 * A form sends an unexpanded reverse foreign key as a list of primary keys. The server applies that list with the related manager's `set()`. When the foreign key is not nullable, `set()` only adds rows, so selecting another parent's row moves it to this parent and removing a row from the list removes nothing. Forms therefore show the field read-only, and create and update views leave it out of the default `submitFields`. A view that names the field in `expand` edits its rows as an inline instead.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo|undefined} field - The field's model info.
 * @returns {boolean} Whether model info describes the field as a reverse foreign key.
 */
export function isReverseForeignKey(field) {
    return field?.typeSerializer === "ManyRelatedField" && field?.typeModel === "ForeignKey";
}

/**
 * Remove each reverse foreign key that `expand` does not name from a list of field names to submit.
 *
 * @param {string[]|undefined} fieldNames - The field names to submit.
 * @param {{[fieldName: string]: import('@vueda/stores/storeModelInfo.js').FieldInfo}|undefined} fieldDetails - The model config's field details.
 * @param {string[]} expand - The relations that the form renders as inline fieldsets.
 * @returns {string[]|undefined} The remaining field names. The result is `undefined` when `fieldNames` is.
 */
export function omitUnexpandedReverseForeignKeys(fieldNames, fieldDetails, expand) {
    return fieldNames?.filter(
        (fieldName) => expand.includes(fieldName) || !isReverseForeignKey(fieldDetails?.[fieldName]),
    );
}
