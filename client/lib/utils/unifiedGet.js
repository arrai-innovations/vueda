import get from "lodash-es/get.js";

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
