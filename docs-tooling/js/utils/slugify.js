export function normalizePath(pathValue) {
    return pathValue ? pathValue.replace(/\\/g, "/") : pathValue;
}

export function slugify(value) {
    if (!value) {
        return "index";
    }
    return normalizePath(value)
        .replace(/[{}]/g, "")
        .replace(/[^a-zA-Z0-9/_.-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-/]+|[-/]+$/g, "");
}
