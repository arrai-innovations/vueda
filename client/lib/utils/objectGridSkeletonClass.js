/**
 * @module utils/objectGridSkeletonClass
 * @description Returns Tailwind classes to size a Skeleton for each field type in an object grid.
 */

/**
 * Returns Tailwind size and shape classes appropriate for a given field type.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldDetail|undefined} field - The field detail object.
 * @returns {string} Tailwind classes for width, height, and border-radius.
 */
export function getSkeletonClassForField(field) {
    if (!field) {
        return "h-3 w-full";
    }

    if (field.skeletonClass) {
        return field.skeletonClass;
    }

    if (field.name === "selected_") {
        return "size-4 rounded-vueda-control";
    }

    if (field.typeSerializer === "BooleanField") {
        return "h-3.5 w-12 rounded-full";
    }

    if (field.choices || field.typeDb === "CharField") {
        return "h-3 w-24";
    }

    if (field.typeDb === "DateField" || field.typeDb === "DateTimeField") {
        return "h-3 w-16";
    }

    if (field.typeDb === "ForeignKey" || field.formatted) {
        return "h-3 w-40";
    }

    return "h-3 w-full";
}
