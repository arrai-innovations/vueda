/**
 * @module utils/reverseForeignKey
 * @description Identifies a reverse foreign key in model info, which forms show read-only unless the view expands it.
 */

/**
 * Report whether a field is a reverse foreign key, such as an order's `items` when each item has a foreign key to its order.
 *
 * A form sends an unexpanded reverse foreign key as a list of primary keys. The server applies that list with the related manager's `set()`. When the foreign key is not nullable, `set()` only adds rows, so selecting another parent's row moves it to this parent and removing a row from the list removes nothing. Forms therefore show the field read-only and leave it out of the default `submitFields`. A view that names the field in `expand` edits its rows as an inline instead.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo|undefined} field - The field's model info.
 * @returns {boolean} Whether model info describes the field as a reverse foreign key.
 */
export function isReverseForeignKey(field) {
    return field?.typeSerializer === "ManyRelatedField" && field?.typeModel === "ForeignKey";
}
