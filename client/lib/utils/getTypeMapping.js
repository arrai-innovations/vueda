/**
 * @module utils/getTypeMapping
 * @description Resolves a per-type mapping entry from a `typeSerializer -> typeModel` lookup table, with a default fallback. Shared by form field/widget resolution (`useFormModel`) and list column resolution (`resolveColumnComponents`). A field whose own serializer type has no entry falls back to the entries of the serializer classes that it inherits from.
 */
import isNil from "lodash-es/isNil.js";

/**
 * List the serializer types to look up for a field, in the order to try them.
 *
 * The list starts with the field's own `typeSerializer`. Each class in `typeSerializerAncestors` follows, nearest first. A project's subclass of a stock serializer field therefore resolves to the stock field's entry, unless a mapping names the subclass itself.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - Field info containing `typeSerializer` and, optionally, `typeSerializerAncestors`.
 * @returns {string[]} The serializer type names to try.
 */
export const getSerializerTypes = (field) => [field.typeSerializer, ...(field.typeSerializerAncestors || [])];

/**
 * Report whether a field's serializer type is a given type or a subclass of it.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo|undefined} field - Field info containing `typeSerializer` and, optionally, `typeSerializerAncestors`.
 * @param {string} typeSerializer - The serializer type name to check for, such as `"ManyRelatedField"`.
 * @returns {boolean} Whether the field's own type or one of its ancestors is `typeSerializer`. The result is false when `field` is undefined.
 */
export const isSerializerType = (field, typeSerializer) =>
    !!field && getSerializerTypes(field).includes(typeSerializer);

/**
 * Pick the entry for a field's `typeModel` from one serializer type's mapping.
 *
 * @template T
 * @param {{[typeModel:string]: T}|undefined} serializerMapping - One serializer type's entries, keyed by typeModel.
 * @param {string|null|undefined} typeModel - The field's model type.
 * @returns {T|undefined} The entry for `typeModel`. Without a `typeModel`, the result is the entry marked `default`.
 */
const getSerializerEntry = (serializerMapping, typeModel) => {
    if (!serializerMapping) {
        return undefined;
    }
    const hasTypeModel = !isNil(typeModel) && typeModel !== "";
    if (hasTypeModel) {
        return serializerMapping[typeModel] || undefined;
    }
    return Object.values(serializerMapping).find((entry) => entry?.default) || undefined;
};

/**
 * Pick one serializer type for a field across several mapping tables.
 *
 * Use this when one field reads more than one table, such as a choice table that overrides the base table. The lookup tries each name from `getSerializerTypes` in turn. It stops at the first name that has an entry for the field's `typeModel` in any of `mappings`. A subclass mapped in any table therefore keeps priority over every ancestor, in every table.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - Field info containing the typeSerializer/typeModel.
 * @param {Array<{[key:string]: {[typeModel:string]: unknown}}>} mappings - The tables that the field reads.
 * @returns {import('@vueda/stores/storeModelInfo.js').FieldInfo} A copy of `field` whose `typeSerializer` is the chosen name and whose `typeSerializerAncestors` is empty, so later lookups read only that name. The result is `field` itself when no name has an entry.
 */
export const resolveSerializerType = (field, mappings) => {
    for (const typeSerializer of getSerializerTypes(field)) {
        if (mappings.some((mapping) => getSerializerEntry(mapping[typeSerializer], field.typeModel))) {
            return { ...field, typeSerializer, typeSerializerAncestors: [] };
        }
    }
    return field;
};

/**
 * Resolve the mapping for a field's serializer type, falling back to the serializer's default entry when `typeModel` is unknown.
 *
 * The lookup tries each name from `getSerializerTypes` in turn and returns the first entry that it finds. A name that has entries, but none for the field's `typeModel`, does not stop the search. The next ancestor is tried instead. When a field reads several tables, call `resolveSerializerType` first, so that every table uses the same name.
 *
 * @template T
 * @param {{[key:string]: {[typeModel:string]: T}}} mapping - The mapping object keyed by typeSerializer and typeModel.
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - Field info containing the typeSerializer/typeModel.
 * @returns {T|undefined} The matched mapping or the default entry for the serializer.
 */
export const getTypeMapping = (mapping, field) => {
    for (const typeSerializer of getSerializerTypes(field)) {
        const entry = getSerializerEntry(mapping[typeSerializer], field.typeModel);
        if (entry) {
            return entry;
        }
    }
    return undefined;
};
