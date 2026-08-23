/**
 * @module utils/objectCrud
 * @description VUEDA-specific object CRUD functions (retrieve, create, update, patch, delete) for a single model instance.
 */
import { cancellableFetch, setObjectCrud } from "@arrai-innovations/reactive-helpers";
import { deepUnref } from "@arrai-innovations/reactive-helpers";
import { EXPAND_PARAM, FIELDS_PARAM } from "@vueda/utils/constants.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { ConfirmationRequiredError, FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { actionRequestHeaders, getJsonOrText, readActionResponse } from "@vueda/utils/fetchSupport.js";
import { getDetailUrl, getListUrl } from "@vueda/utils/urls.js";
import isObject from "lodash-es/isObject.js";

const makeSearchParamsString = (searchParams) => {
    const params = deepUnref(searchParams);
    if (!params) {
        return "";
    }
    if (Object.keys(params[FIELDS_PARAM] ?? []).length === 0 && Object.keys(params[EXPAND_PARAM] ?? []).length === 0) {
        return "";
    }
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
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

/**
 * Converts an object into a `FormData` instance, handling nested arrays, objects, and files.
 * - If a property is an array, it appends each element in the array.
 * - If a property is an object (excluding `File` instances), it appends each nested property.
 * - If a property is a `File`, it appends it directly.
 * - If a property is empty or undefined, it appends an empty string.
 *
 * @param {{ [key: string]: unknown }} object - The source object to convert into `FormData`.
 * @returns {FormData} - A `FormData` instance containing key-value pairs from the object, formatted for multipart form submission.
 */
const getFormData = (object) => {
    const formData = new FormData();
    for (const key in object) {
        if (object[key]) {
            if (Array.isArray(object[key])) {
                const o = object[key];
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
 * @param args {object} - The arguments object.
 * @param args.target {{
 *     app:string,
 *     model:string,
 *     action?:string,
 * }} - VUEDA specific arguments for the CRUD operation.
 * @param args.pk {string} - The primary key of the object to retrieve.
 * @param args.params {object} - The arguments to be passed as querystring to the retrieve action.
 * @returns {import("@arrai-innovations/reactive-helpers").CancellablePromise<import("@arrai-innovations/reactive-helpers").CrudObject>} - A cancellable promise.
 */
export function defaultObjectRetrieve({ target, pk, params }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model, action } = target;
    const query = params ? makeSearchParamsString(params) : "";
    const url = getDetailUrl({ app, model, pk, action, query });

    return cancellableFetch(
        url,
        {
            method: "GET",
            credentials: "include",
        },
        async (response) => {
            const responseData = await getJsonOrText(response);
            if (response.status === 200) {
                return /** @type{import("@arrai-innovations/reactive-helpers").CrudObject} */ responseData;
            }
            throw new FetchError("Failed to retrieve object", response, responseData);
        },
    );
}

/**
 * The VUEDA specific implementation for reactive-helper's object create crud function.
 *
 * @param args {object} - The arguments object.
 * @param args.target {{
 *     app: string,
 *     model: string,
 *     action?: string,
 *     pk?: string,
 * }} - VUEDA specific arguments for the CRUD operation.
 * @param args.object {object} - The object to create.
 * @param args.params {object} - The arguments to be passed as querystring to the retrieve action.
 * @returns {import("@arrai-innovations/reactive-helpers").CancellablePromise<import("@arrai-innovations/reactive-helpers").CrudObject>} - A cancellable promise.
 */
export function defaultObjectCreate({ target, object, params, acknowledgeWarnings }) {
    const { app, model, action, pk } = target;
    const query = params ? makeSearchParamsString(params) : "";
    const controller = new AbortController();
    const url = pk ? getDetailUrl({ app, model, pk, action, query }) : getListUrl({ app, model, action, query });

    const hasFile = Object.values(object).some((value) => value instanceof File || value instanceof Blob);
    const headers = {
        "X-CSRFToken": getCSRFValue(),
    };
    if (!hasFile) {
        headers["Content-Type"] = "application/json";
    }
    if (acknowledgeWarnings) {
        headers["Acknowledge-Warnings"] = acknowledgeWarnings;
    }
    const body = hasFile ? getFormData(object) : JSON.stringify(object);

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
        if (response.status === 409) {
            throw new ConfirmationRequiredError(responseData, response);
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
 * @param args {object} - The arguments object.
 * @param args.target {{
 *     app: string,
 *     model: string,
 *     action?: string,
 * }} - VUEDA specific arguments for the CRUD operation.
 * @param args.object {import("@arrai-innovations/reactive-helpers").CrudObject} - The object to update.
 * @param args.pkKey {string} - The primary key field name on the object. Defaults to `id`.
 * @param args.params {object} - The arguments to be passed as querystring to the retrieve action.
 * @returns {import("@arrai-innovations/reactive-helpers").CancellablePromise<import("@arrai-innovations/reactive-helpers").CrudObject>} - A cancellable promise.
 */
export function defaultObjectUpdate({ target, object, pkKey = "id", params, acknowledgeWarnings }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model, action } = target;
    const pk = object[pkKey];
    const query = params ? makeSearchParamsString(params) : "";
    const url = getDetailUrl({ app, model, pk, action, query });

    const hasFile = Object.values(object).some((value) => value instanceof File || value instanceof Blob);
    const headers = {
        "X-CSRFToken": getCSRFValue(),
    };
    if (!hasFile) {
        headers["Content-Type"] = "application/json";
    }
    if (acknowledgeWarnings) {
        headers["Acknowledge-Warnings"] = acknowledgeWarnings;
    }
    const body = hasFile ? getFormData(object) : JSON.stringify(object);

    return cancellableFetch(
        url,
        {
            method: "PUT",
            headers,
            credentials: "include",
            body,
        },
        async (response) => {
            const responseData = await getJsonOrText(response);
            if (response.status === 200) {
                return responseData;
            }
            if (response.status === 400) {
                throw new FormValidationError(responseData, response);
            }
            if (response.status === 409) {
                throw new ConfirmationRequiredError(responseData, response);
            }
            throw new FetchError("Failed to update object", response, responseData);
        },
    );
}

/**
 * The VUEDA specific implementation for reactive-helper's object patch crud function.
 *
 * @param args {object} - The arguments object.
 * @param args.target {{
 *     app: string,
 *     model: string,
 *     action?: string,
 * }} - VUEDA specific arguments for the CRUD operation.
 * @param args.pk {string} - The primary key of the object to patch.
 * @param args.partialObject {object} - The partial object to patch.
 * @param args.params {object} - The arguments to be passed as querystring to the retrieve action.
 * @returns {import("@arrai-innovations/reactive-helpers").CancellablePromise<import("@arrai-innovations/reactive-helpers").CrudObject>} - A cancellable promise.
 */
export function defaultObjectPatch({ target, pk, partialObject, params }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model, action } = target;
    const query = params ? makeSearchParamsString(params) : "";
    const url = getDetailUrl({ app, model, pk, action, query });

    const hasFile = Object.values(partialObject).some((value) => value instanceof File || value instanceof Blob);
    const headers = {
        "X-CSRFToken": getCSRFValue(),
    };
    if (!hasFile) {
        headers["Content-Type"] = "application/json";
    }
    const body = hasFile ? getFormData(partialObject) : JSON.stringify(partialObject);

    return cancellableFetch(
        url,
        {
            method: "PATCH",
            headers,
            credentials: "include",
            body,
        },
        async (response) => {
            const responseData = await getJsonOrText(response);
            if (response.status === 200) {
                return responseData;
            }
            if (response.status === 400) {
                throw new FormValidationError(responseData, response);
            }
            throw new FetchError("Failed to patch object", response, responseData);
        },
    );
}

/**
 * The VUEDA specific implementation for reactive-helper's object delete crud function.
 *
 * @param args {object} - The arguments object.
 * @param args.target {{ app:string, model:string }} - VUEDA specific arguments for the CRUD operation.
 * @param args.pk {string} - The primary key of the object to delete.
 * @param args.deleteArgs {object} - The arguments to be passed to the delete function.
 * @param [args.formData] {object} - Extra fields submitted alongside the delete, sent as the request body.
 * @param [args.dryRun] {boolean} - When true, sends the request in dry-run mode. The server answers a valid dry run
 *  `200`, so that status is a success here only while `dryRun` is set; a `200` on a real delete stays a fault.
 * @param [args.acknowledgeWarnings] {string} - Warnings digest from a prior 409, sent as the `Acknowledge-Warnings`
 *  header so the server lets the gated delete proceed.
 * @returns {Promise<void> & { cancel: () => Promise<void> }} - A cancellable promise.
 */
export function defaultObjectDelete({ target, pk, deleteArgs, formData, dryRun, acknowledgeWarnings }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model, action } = target;
    const query = deleteArgs ? makeSearchParamsString(deleteArgs) : "";
    const url = getDetailUrl({ app, model, pk, action, query });

    return cancellableFetch(
        url,
        {
            method: "DELETE",
            headers: actionRequestHeaders({ dryRun, acknowledgeWarnings }),
            credentials: "include",
            body: formData ? JSON.stringify(formData) : undefined,
        },
        async (response) =>
            readActionResponse(response, {
                messagePrefix: "Failed to delete object",
                successStatuses: dryRun ? new Set([200, 204]) : new Set([204]),
            }),
    );
}

/**
 * The VUEDA specific implementation for reactive-helper's object executeAction crud function. Sends a named action to
 * the model's detail action url.
 *
 * @param args {object} - The arguments object.
 * @param args.target {{ app:string, model:string }} - VUEDA specific arguments for the CRUD operation.
 * @param args.pk {string} - The primary key of the object to act on.
 * @param args.action {string} - The action name, used as the url's action segment.
 * @param [args.requestMethod] {string} - The HTTP method for the request. Defaults to `"PUT"`.
 * @param [args.formData] {object} - Form values submitted with the action, sent as the request body.
 * @param [args.dryRun] {boolean} - When true, sends the request in dry-run mode.
 * @param [args.acknowledgeWarnings] {string} - Warnings digest from a prior 409, sent as the `Acknowledge-Warnings`
 *  header so the server lets the gated action proceed.
 * @returns {import("@arrai-innovations/reactive-helpers").CancellablePromise<object|string|undefined>} - A cancellable promise.
 */
export function defaultObjectExecuteAction({
    target,
    pk,
    action,
    requestMethod = "PUT",
    formData,
    dryRun,
    acknowledgeWarnings,
}) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model } = target;
    const url = getDetailUrl({ app, model, pk, action });

    return cancellableFetch(
        url,
        {
            method: requestMethod,
            headers: actionRequestHeaders({ dryRun, acknowledgeWarnings }),
            credentials: "include",
            body: formData ? JSON.stringify(formData) : undefined,
        },
        async (response) => readActionResponse(response, { messagePrefix: "Failed to execute action" }),
    );
}

/**
 * Installs the default object CRUD adaptors for retrieve, create, update, patch, delete, and executeAction.
 */
export function setupDefaultObjectCrud() {
    setObjectCrud({
        retrieve: defaultObjectRetrieve,
        create: defaultObjectCreate,
        update: defaultObjectUpdate,
        patch: defaultObjectPatch,
        delete: defaultObjectDelete,
        executeAction: defaultObjectExecuteAction,
    });
}
