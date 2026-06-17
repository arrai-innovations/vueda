/**
 * @module utils/getTypeMapping
 * @description Resolves a per-type mapping entry from a `typeSerializer -> typeModel` lookup table, with a default fallback. Shared by form field/widget resolution (`useFormModel`) and list column resolution (`resolveColumnComponents`).
 */
import isNil from "lodash-es/isNil.js";

/**
 * Resolve the mapping for a field's `typeSerializer`, falling back to the serializer's default entry when `typeModel` is unknown.
 *
 * @template T
 * @param {{[key:string]: {[typeModel:string]: T}}} mapping - The mapping object keyed by typeSerializer and typeModel.
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - Field info containing the typeSerializer/typeModel.
 * @returns {T|undefined} The matched mapping or the default entry for the serializer.
 */
export const getTypeMapping = (mapping, field) => {
    const serializerMapping = mapping[field.typeSerializer];
    if (!serializerMapping) {
        return undefined;
    }
    const hasTypeModel = !isNil(field.typeModel) && field.typeModel !== "";
    if (hasTypeModel && serializerMapping[field.typeModel]) {
        return serializerMapping[field.typeModel];
    }
    if (!hasTypeModel) {
        return Object.values(serializerMapping).find((entry) => entry?.default) || undefined;
    }
    return undefined;
};
