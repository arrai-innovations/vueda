export function compact(value) {
    if (Array.isArray(value)) {
        return value.filter((item) => item !== undefined).map(compact);
    }
    if (value && typeof value === "object") {
        for (const key of Object.keys(value)) {
            const item = value[key];
            if (item === undefined) {
                delete value[key];
            } else if (item && typeof item === "object") {
                value[key] = compact(item);
            }
        }
    }
    return value;
}
