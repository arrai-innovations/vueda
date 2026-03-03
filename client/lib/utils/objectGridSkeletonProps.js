/**
 * @module utils/objectGridSkeletonProps
 * @description Returns skeleton loader dimension props appropriate for each field type in an object grid.
 */

export function getSkeletonPropsForField(field) {
    if (!field) {
        return { width: "100%", height: "1.5rem" };
    }

    if (field.skeleton) {
        return { width: "100%", height: "1.5rem", ...field.skeleton };
    }

    if (field.name === "selected_") {
        return { width: "1.5rem", height: "1.5rem", borderRadius: "9999px" };
    }

    if (field.typeSerializer === "BooleanField") {
        return { width: "3rem", height: "1.5rem", borderRadius: "9999px" };
    }

    if (field.choices || field.typeDb === "CharField") {
        return { width: "6rem", height: "1.5rem" };
    }

    if (field.typeDb === "DateField" || field.typeDb === "DateTimeField") {
        return { width: "4rem", height: "1.5rem" };
    }

    if (field.typeDb === "ForeignKey" || field.formatted) {
        return { width: "10rem", height: "1.5rem" };
    }

    return { width: "100%", height: "1.5rem" };
}
