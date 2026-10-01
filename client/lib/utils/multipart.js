/**
 * @module utils/multipart
 * @description Encodes object saves as JSON or multipart with JSON fields and file paths.
 */
import isPlainObject from "lodash-es/isPlainObject.js";

const MANIFEST = "__vueda_multipart";

/**
 * @param {unknown} value
 * @param {WeakSet<object>} seen
 * @returns {boolean}
 */
function containsFile(value, seen = new WeakSet()) {
    if (value instanceof Blob) {
        return true;
    }
    if (value === null || typeof value !== "object" || seen.has(value)) {
        return false;
    }
    seen.add(value);
    return Object.values(value).some((item) => containsFile(item, seen));
}

/**
 * Keep JSON for saves without files. Multipart fields contain JSON values, with
 * null placeholders for files; the manifest maps file part names to their paths.
 * Unsupported multipart values throw before a request is sent.
 *
 * @param {{ [key: string]: unknown }} object - The values to save.
 * @returns {string|FormData} The encoded request body.
 */
export function encodeObjectBody(object) {
    if (!containsFile(object)) {
        return JSON.stringify(object);
    }
    if (!isPlainObject(object)) {
        throw new TypeError("Cannot encode multipart value at $: expected an object of fields");
    }

    const body = new FormData();
    const files = Object.create(null);
    const ancestors = new WeakSet();
    let nextFile = 0;

    /**
     * @param {unknown} value
     * @param {(string|number)[]} path
     * @returns {unknown}
     */
    function encode(value, path) {
        const location = path.reduce((name, part) => `${name}[${JSON.stringify(part)}]`, "$");
        const fail = (reason) => {
            throw new TypeError(`Cannot encode multipart value at ${location}: ${reason}`);
        };
        if (value instanceof Blob) {
            let part = path[0];
            if (path.length > 1) {
                do {
                    part = `__vueda_file_${nextFile++}`;
                } while (Object.hasOwn(object, part));
            }
            files[part] = path;
            body.append(part, value);
            return null;
        }
        if (value === null || typeof value === "string" || typeof value === "boolean") {
            return value;
        }
        if (typeof value === "number" && Number.isFinite(value)) {
            return value;
        }
        if (!Array.isArray(value) && !isPlainObject(value)) {
            fail("expected a JSON value, File, or Blob");
        }
        if (ancestors.has(value)) {
            fail("circular reference");
        }
        if (Object.getOwnPropertySymbols(value).some((key) => Object.prototype.propertyIsEnumerable.call(value, key))) {
            fail("symbol keys are not supported");
        }
        ancestors.add(value);
        let result;
        if (Array.isArray(value)) {
            if (Object.keys(value).some((key) => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
                fail("array properties are not supported");
            }
            result = Array.from(value, (item, index) => encode(item, [...path, index]));
        } else {
            result = Object.fromEntries(
                Object.entries(value).map(([key, item]) => [key, encode(item, [...path, key])]),
            );
        }
        ancestors.delete(value);
        return result;
    }

    if (Object.hasOwn(object, MANIFEST)) {
        throw new TypeError(`Cannot encode multipart value at $["${MANIFEST}"]: reserved field name`);
    }
    const data = encode(object, []);
    for (const [key, value] of Object.entries(data)) {
        if (!(object[key] instanceof Blob)) {
            body.append(key, JSON.stringify(value));
        }
    }
    body.append(MANIFEST, JSON.stringify({ version: 1, files }));
    return body;
}
