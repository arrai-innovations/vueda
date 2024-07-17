import { setObjectCrud } from "@arrai-innovations/reactive-helpers";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getServerRoutePart } from "@vueda/utils/crudSupport.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { getUrl } from "@vueda/utils/urls.js";
import isArray from "lodash-es/isArray.js";
import { deepUnref } from "vue-deepunref";

const makeSearchParamsString = (searchParams) => {
    const params = deepUnref(searchParams);
    if (!params) {
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

const getDetailUrl = (app, model, pk, queryString) =>
    `${httpOrHttpsHostname}${getUrl("modelDetail").replace(":app", getServerRoutePart(app)).replace(":model", getServerRoutePart(model)).replace(":pk", pk)}${queryString}`;
const getCreateUrl = (app, model, queryString) =>
    `${httpOrHttpsHostname}${getUrl("modelList").replace(":app", getServerRoutePart(app)).replace(":model", getServerRoutePart(model))}${queryString}`;

export async function defaultObjectRetrieve({ crudArgs, id, retrieveArgs }) {
    const query = retrieveArgs ? makeSearchParamsString(retrieveArgs) : "";
    const controller = new AbortController();
    const url = getDetailUrl(crudArgs.app, crudArgs.model, id, query);
    /** @type {import('@arrai-innovations/reactive-helpers').CancellablePromise} */
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
    returnPromise.cancel = () => controller.abort();
    return returnPromise;
}

export async function defaultObjectCreate({ crudArgs, object, retrieveArgs }) {
    const query = retrieveArgs ? makeSearchParamsString(retrieveArgs) : "";
    const controller = new AbortController();
    const url = getCreateUrl(crudArgs.app, crudArgs.model, query);
    /** @type {import('@arrai-innovations/reactive-helpers').CancellablePromise} */
    const returnPromise = fetch(url, {
        method: "POST",
        headers: {
            "X-CSRFToken": getCSRFValue(),
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(object),
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
    returnPromise.cancel = () => controller.abort();
    return returnPromise;
}

export async function defaultObjectUpdate({ crudArgs, object, retrieveArgs }) {
    const query = retrieveArgs ? makeSearchParamsString(retrieveArgs) : "";
    const controller = new AbortController();
    const url = getDetailUrl(crudArgs.app, crudArgs.model, object.id, query);
    /** @type {import('@arrai-innovations/reactive-helpers').CancellablePromise} */
    const returnPromise = fetch(url, {
        method: "PUT",
        headers: {
            "X-CSRFToken": getCSRFValue(),
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(object),
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
    returnPromise.cancel = () => controller.abort();
    return returnPromise;
}

export async function defaultObjectPatch({ crudArgs, id, partialObject, retrieveArgs }) {
    const query = retrieveArgs ? makeSearchParamsString(retrieveArgs) : "";
    const controller = new AbortController();
    const url = getDetailUrl(crudArgs.app, crudArgs.model, id, query);
    /** @type {import('@arrai-innovations/reactive-helpers').CancellablePromise} */
    const returnPromise = fetch(url, {
        method: "PATCH",
        headers: {
            "X-CSRFToken": getCSRFValue(),
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(partialObject),
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
    returnPromise.cancel = () => controller.abort();
    return returnPromise;
}

export async function defaultObjectDelete({ crudArgs, id, deleteArgs }) {
    const abortController = new AbortController();
    const url = getDetailUrl(crudArgs.app, crudArgs.model, id);
    /** @type {import('@arrai-innovations/reactive-helpers').CancellablePromise} */
    const returnPromise = fetch(url, {
        method: "DELETE",
        headers: {
            "X-CSRFToken": getCSRFValue(),
        },
        credentials: "include",
        ...deleteArgs,
        signal: abortController.signal,
    }).then(async (response) => {
        if (response.status === 204) {
            return;
        }
        throw new FetchError("Failed to delete object", response, await getJsonOrText(response));
    });
    returnPromise.cancel = () => abortController.abort();
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
