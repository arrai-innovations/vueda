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
 * - If a property is `null` or `undefined`, it appends an empty string. Other falsy values such as
 *   `false`, `0`, and `""` are appended as their string form.
 *
 * @param {{ [key: string]: unknown }} object - The source object to convert into `FormData`.
 * @returns {FormData} - A `FormData` instance containing key-value pairs from the object, formatted for multipart form submission.
 */
const getFormData = (object) => {
    const formData = new FormData();
    for (const key in object) {
        if (object[key] !== null && object[key] !== undefined) {
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
 * @param {object} args - The arguments object.
 * @param {{
 *     app:string,
 *     model:string,
 *     action?:string,
 * }} args.target - VUEDA specific arguments for the CRUD operation.
 * @param {string} args.pk - The primary key of the object to retrieve.
 * @param {object} args.params - The arguments to be passed as querystring to the retrieve action.
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
 * @param {object} args - The arguments object.
 * @param {{
 *     app: string,
 *     model: string,
 *     action?: string,
 *     pk?: string,
 * }} args.target - VUEDA specific arguments for the CRUD operation.
 * @param {object} args.object - The object to create.
 * @param {object} args.params - The arguments to be passed as querystring to the retrieve action.
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
            throw new ConfirmationRequiredError(responseData, response, { bulk: false });
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
 * @param {object} args - The arguments object.
 * @param {{
 *     app: string,
 *     model: string,
 *     action?: string,
 * }} args.target - VUEDA specific arguments for the CRUD operation.
 * @param {import("@arrai-innovations/reactive-helpers").CrudObject} args.object - The object to update.
 * @param {string} args.pkKey - The primary key field name on the object. Defaults to `id`.
 * @param {object} args.params - The arguments to be passed as querystring to the retrieve action.
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
                throw new ConfirmationRequiredError(responseData, response, { bulk: false });
            }
            throw new FetchError("Failed to update object", response, responseData);
        },
    );
}

/**
 * The VUEDA specific implementation for reactive-helper's object patch crud function.
 *
 * @param {object} args - The arguments object.
 * @param {{
 *     app: string,
 *     model: string,
 *     action?: string,
 * }} args.target - VUEDA specific arguments for the CRUD operation.
 * @param {string} args.pk - The primary key of the object to patch.
 * @param {object} args.partialObject - The partial object to patch.
 * @param {object} args.params - The arguments to be passed as querystring to the retrieve action.
 * @param {string} [args.acknowledgeWarnings] - Warning digest from a prior 409, sent as `Acknowledge-Warnings`.
 * @returns {import("@arrai-innovations/reactive-helpers").CancellablePromise<import("@arrai-innovations/reactive-helpers").CrudObject>} - A cancellable promise.
 */
export function defaultObjectPatch({ target, pk, partialObject, params, acknowledgeWarnings }) {
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
    if (acknowledgeWarnings) {
        headers["Acknowledge-Warnings"] = acknowledgeWarnings;
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
            if (response.status === 409) {
                throw new ConfirmationRequiredError(responseData, response, { bulk: false });
            }
            throw new FetchError("Failed to patch object", response, responseData);
        },
    );
}

/**
 * The VUEDA specific implementation for reactive-helper's object delete crud function.
 *
 * @param {object} args - The arguments object.
 * @param {{ app:string, model:string }} args.target - VUEDA specific arguments for the CRUD operation.
 * @param {string} args.pk - The primary key of the object to delete.
 * @param {object} args.deleteArgs - The arguments to be passed to the delete function.
 * @param {object} [args.formData] - Extra fields submitted alongside the delete, sent as the request body.
 * @param {boolean} [args.dryRun] - Dry-run requests treat a server `200` as success; real deletes still require `204`.
 * @param {string} [args.acknowledgeWarnings] - Warning digest from a prior 409, sent as `Acknowledge-Warnings`.
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
                bulk: false,
            }),
    );
}

/**
 * The VUEDA specific implementation for reactive-helper's object executeAction crud function. Sends a named action to
 * the model's detail action url.
 *
 * @param {object} args - The arguments object.
 * @param {{ app:string, model:string }} args.target - VUEDA specific arguments for the CRUD operation.
 * @param {string} args.pk - The primary key of the object to act on.
 * @param {string} args.action - The action name, used as the url's action segment.
 * @param {string} [args.requestMethod] - The HTTP method for the request. Defaults to `"PUT"`.
 * @param {object} [args.formData] - Form values submitted with the action, sent as the request body.
 * @param {boolean} [args.dryRun] - When true, sends the request in dry-run mode.
 * @param {string} [args.acknowledgeWarnings] - Warning digest from a prior 409, sent as `Acknowledge-Warnings`.
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
        async (response) => readActionResponse(response, { messagePrefix: "Failed to execute action", bulk: false }),
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
