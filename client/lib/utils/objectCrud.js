import { setObjectCrud } from "@arrai-innovations/reactive-helpers";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getServerRoutePart } from "@vueda/utils/crudSupport.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { getUrl } from "@vueda/utils/urls.js";
import { isObject } from "lodash-es";
import isArray from "lodash-es/isArray.js";
import { unref } from "vue";
import { deepUnref } from "vue-deepunref";

const makeSearchParamsString = (searchParams) => {
    const params = deepUnref(searchParams);
    if (!params) {
        return "";
    }
    if (Object.keys(params.f).length === 0) {
        return "";
    }
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (isArray(value)) {
            // Filter out undefined values and join array elements into a comma-separated string
            const filteredValues = value.filter((v) => v !== undefined).join(",");
            if (filteredValues) {
                usp.set(key, filteredValues);
            }
        } else if (value !== undefined) {
            usp.set(key, value);
        }
    });
    return `?${usp.toString()}`;
};

export const getDetailUrl = (app, model, pk, queryString) =>
    `${httpOrHttpsHostname}${getUrl("modelDetail").replace(":app", getServerRoutePart(app)).replace(":model", getServerRoutePart(model)).replace(":pk", pk)}${queryString}`;

export const getCreateUrl = (app, model, queryString) =>
    `${httpOrHttpsHostname}${getUrl("modelList").replace(":app", getServerRoutePart(app)).replace(":model", getServerRoutePart(model))}${queryString}`;

/**
 * Converts an object into a `FormData` instance, handling nested arrays, objects, and files.
 * - If a property is an array, it appends each element in the array.
 * - If a property is an object (excluding `File` instances), it appends each nested property.
 * - If a property is a `File`, it appends it directly.
 * - If a property is empty or undefined, it appends an empty string.
 *
 * @param {object} object - The source object to convert into `FormData`.
 * @returns {FormData} - A `FormData` instance containing key-value pairs from the object, formatted for multipart form submission.
 */
const getFormData = (object) => {
    const formData = new FormData();
    for (const key in object) {
        if (object[key] && object[key] !== {} && object[key] !== []) {
            if (Array.isArray(object[key])) {
                const o = unref(object[key]);
                o.forEach((value, i) => {
                    if (isObject(value) && !(value instanceof File)) {
                        for (const name in value) {
                            formData.append(`${key}[${i}]${name}`, value[name]);
                        }
                    } else {
                        formData.append(`${key}`, value);
                    }
                });
            } else if (isObject(object[key]) && !(object[key] instanceof File)) {
                for (const name in object[key]) {
                    formData.append(`${key}.${name}`, object[key][name]);
                }
            } else {
                formData.append(`${key}`, object[key]);
            }
        } else {
            formData.append(`${key}`, "");
        }
    }
    return formData;
};

/**
 * The VUEDA specific implementation for reactive-helper's object retrieve crud function.
 *
 * @params args {object} - The arguments object.
 * @params args.crudArgs {{ app:string, model:string }} - VUEDA specific arguments for the CRUD operation.
 * @params args.pk {string} - The primary key of the object to retrieve.
 * @params args.retrieveArgs {object} - The arguments to be passed as querystring to the retrieve action.
 * @returns {Promise<void> & { cancel: () => Promise<void> }} - A cancellable promise.
 */
export function defaultObjectRetrieve({ crudArgs, pk, retrieveArgs }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const query = retrieveArgs ? makeSearchParamsString(retrieveArgs) : "";
    const controller = new AbortController();
    const url = getDetailUrl(crudArgs.app, crudArgs.model, pk, query);

    /** @type {Promise<void> & { cancel: () => Promise<void> }} */
    const returnPromise = fetch(url, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
    }).then(async (response) => {
        const responseData = await getJsonOrText(response);
        if (response.status === 200) {
            return responseData;
        }
        throw new FetchError("Failed to retrieve object", response, responseData);
    });

    returnPromise.cancel = async () => {
        controller.abort();
        await returnPromise.catch(() => {});
    };

    return returnPromise;
}

/**
 * The VUEDA specific implementation for reactive-helper's object create crud function.
 *
 * @params args {object} - The arguments object.
 * @params args.crudArgs {{ app:string, model:string }} - VUEDA specific arguments for the CRUD operation.
 * @params args.object {object} - The object to create.
 * @params args.retrieveArgs {object} - The arguments to be passed as querystring to the retrieve action.
 * @returns {Promise<import("@arrai-innovations/reactive-helpers").CrudObject> & { cancel: () => Promise<void> }} - A cancellable promise.
 */
export async function defaultObjectCreate({ crudArgs, object, retrieveArgs }) {
    const query = retrieveArgs ? makeSearchParamsString(retrieveArgs) : "";
    const controller = new AbortController();
    const url = getCreateUrl(crudArgs.app, crudArgs.model, query);

    const hasFile = Object.values(object).some((value) => value instanceof File || value instanceof Blob);
    const headers = {
        "X-CSRFToken": getCSRFValue(),
    };
    if (!hasFile) {
        headers["Content-Type"] = "application/json";
    }
    const body = hasFile ? getFormData(object) : JSON.stringify(object);
     /** @type {Promise<import("@arrai-innovations/reactive-helpers").CrudObject> & { cancel: () => Promise<void> }} */
    const returnPromise = fetch(url, {
        method: "POST",
        headers,
        credentials: "include",
        body,
        signal: controller.signal,
    }).then(async (response) => {
        const responseData = await getJsonOrText(response);
        if (response.status === 201) {
            return responseData;
        }
        if (response.status === 400) {
            throw new FormValidationError(responseData, response);
        }
        throw new FetchError("Failed to create object", response, responseData);
    });

    returnPromise.cancel = async () => {
        controller.abort();
        await returnPromise.catch(() => {});
    };

    return returnPromise;
}

/**
 * The VUEDA specific implementation for reactive-helper's object update crud function.
 *
 * @params args {object} - The arguments object.
 * @params args.crudArgs {{ app:string, model:string }} - VUEDA specific arguments for the CRUD operation.
 * @params args.object {import("@arrai-innovations/reactive-helpers").CrudObject} - The object to update.
 * @params args.retrieveArgs {object} - The arguments to be passed as querystring to the retrieve action.
 * @returns {Promise<import("@arrai-innovations/reactive-helpers").CrudObject> & { cancel: () => Promise<void> }} - A cancellable promise.
 */
export function defaultObjectUpdate({ crudArgs, object, retrieveArgs }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const query = retrieveArgs ? makeSearchParamsString(retrieveArgs) : "";
    const controller = new AbortController();
    const url = getDetailUrl(crudArgs.app, crudArgs.model, object.id, query);

    const hasFile = Object.values(object).some((value) => value instanceof File || value instanceof Blob);
    const headers = {
        "X-CSRFToken": getCSRFValue(),
    };
    if (!hasFile) {
        headers["Content-Type"] = "application/json";
    }
    const body = hasFile ? JSON.stringify(object) : getFormData(object);

    /** @type {Promise<import("@arrai-innovations/reactive-helpers").CrudObject> & { cancel: () => Promise<void> }} */
    const body = hasFile ? getFormData(object) : JSON.stringify(object);
    /** @type {import('@arrai-innovations/reactive-helpers').CancellablePromise} */
    const returnPromise = fetch(url, {
        method: "PUT",
        headers,
        credentials: "include",
        body,
        signal: controller.signal,
    }).then(async (response) => {
        const responseData = await getJsonOrText(response);
        if (response.status === 200) {
            return responseData;
        }
        if (response.status === 400) {
            throw new FormValidationError(responseData, response);
        }
        throw new FetchError("Failed to update object", response, responseData);
    });

    returnPromise.cancel = async () => {
        controller.abort();
        await returnPromise.catch(() => {});
    };

    return returnPromise;
}

/**
 * The VUEDA specific implementation for reactive-helper's object patch crud function.
 *
 * @params args {object} - The arguments object.
 * @params args.crudArgs {{ app:string, model:string }} - VUEDA specific arguments for the CRUD operation.
 * @params args.pk {string} - The primary key of the object to patch.
 * @params args.partialObject {object} - The partial object to patch.
 * @params args.retrieveArgs {object} - The arguments to be passed as querystring to the retrieve action.
 * @returns {Promise<import("@arrai-innovations/reactive-helpers").CrudObject> & { cancel: () => Promise<void> }} - A cancellable promise.
 */
export function defaultObjectPatch({ crudArgs, pk, partialObject, retrieveArgs }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const query = retrieveArgs ? makeSearchParamsString(retrieveArgs) : "";
    const controller = new AbortController();
    const url = getDetailUrl(crudArgs.app, crudArgs.model, pk, query);

    /** @type {Promise<import("@arrai-innovations/reactive-helpers").CrudObject> & { cancel: () => Promise<void> }} */
    const hasFile = Object.values(partialObject).some((value) => value instanceof File || value instanceof Blob);
    const headers = {
        "X-CSRFToken": getCSRFValue(),
    };
    if (!hasFile) {
        headers["Content-Type"] = "application/json";
    }
    const body = hasFile ? getFormData(partialObject) : JSON.stringify(partialObject);
    /** @type {import('@arrai-innovations/reactive-helpers').CancellablePromise} */
    const returnPromise = fetch(url, {
        method: "PATCH",
        headers,
        credentials: "include",
        body,
        signal: controller.signal,
    }).then(async (response) => {
        const responseData = await getJsonOrText(response);
        if (response.status === 200) {
            return responseData;
        }
        if (response.status === 400) {
            throw new FormValidationError(responseData, response);
        }
        throw new FetchError("Failed to patch object", response, responseData);
    });

    returnPromise.cancel = async () => {
        controller.abort();
        await returnPromise.catch(() => {});
    };

    return returnPromise;
}

/**
 * The VUEDA specific implementation for reactive-helper's object delete crud function.
 *
 * @params args {object} - The arguments object.
 * @params args.crudArgs {{ app:string, model:string }} - VUEDA specific arguments for the CRUD operation.
 * @params args.pk {string} - The primary key of the object to delete.
 * @params args.deleteArgs {object} - The arguments to be passed to the delete function.
 * @returns {Promise<void> & { cancel: () => Promise<void> }} - A cancellable promise.
 */
export function defaultObjectDelete({ crudArgs, pk, deleteArgs }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const controller = new AbortController();
    const url = getDetailUrl(crudArgs.app, crudArgs.model, pk);

    /** @type {Promise<void> & { cancel: () => Promise<void> }} */
    const returnPromise = fetch(url, {
        method: "DELETE",
        headers: {
            "X-CSRFToken": getCSRFValue(),
        },
        credentials: "include",
        ...deleteArgs,
        signal: controller.signal,
    }).then(async (response) => {
        if (response.status === 204) {
            return;
        }
        throw new FetchError("Failed to delete object", response, await getJsonOrText(response));
    });

    returnPromise.cancel = async () => {
        controller.abort();
        await returnPromise.catch(() => {});
    };

    return returnPromise;
}

export function setupDefaultObjectCrud() {
    setObjectCrud({
        retrieve: defaultObjectRetrieve,
        create: defaultObjectCreate,
        update: defaultObjectUpdate,
        patch: defaultObjectPatch,
        delete: defaultObjectDelete,
    });
}
