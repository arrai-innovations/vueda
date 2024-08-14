import { setListCrud } from "@arrai-innovations/reactive-helpers";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getServerRoutePart } from "@vueda/utils/crudSupport.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { getUrl } from "@vueda/utils/urls.js";
import { isObject } from "lodash-es";
import isArray from "lodash-es/isArray.js";
import omit from "lodash-es/omit.js";
import pLimit from "p-limit";
import { deepUnref } from "vue-deepunref";

const getListUrl = (app, model, queryString) =>
    `${httpOrHttpsHostname}${getUrl("modelList").replace(":app", getServerRoutePart(app)).replace(":model", getServerRoutePart(model))}${queryString}`;

export const getActionUrl = (app, model, actionName) =>
    `${httpOrHttpsHostname}${getUrl("modelBulkAction").replace(":app", getServerRoutePart(app)).replace(":model", getServerRoutePart(model)).replace(":action_name", actionName)}`;

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

/**
 * Adapt a single page paginated list to a CRUD list, using useList from reactive-helpers.
 *
 * @param {object} args - The arguments object.
 * @param {object} args.crudArgs - The arguments for the CRUD operation.
 * @param {object} args.listArgs - The arguments for the list operation.
 * @param {(newObjects: import('@arrai-innovations/reactive-helpers').ListObject[], pageData: {
 *     totalRecords: number,
 *     totalPages: number,
 *     perPage: number,
 * }) => void} args.pageCallback - The callback function to call with the page data.
 * @returns {import('@arrai-innovations/reactive-helpers').CancellablePromise} A cancellable promise.
 */
export function singlePagePaginatedListCrudAdaptor({ crudArgs, listArgs, pageCallback }) {
    const query = makeSearchParamsString(listArgs);
    const controller = new AbortController();
    const url = getListUrl(crudArgs.app, crudArgs.model, query);
    /** @type {import('@arrai-innovations/reactive-helpers').CancellablePromise} */
    const returnPromise = fetch(url, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
    }).then(async (response) => {
        const responseData = await getJsonOrText(response);
        if (!isObject(responseData)) {
            throw new FetchError("Failed to single page list", response, responseData);
        }
        if (response.status === 200) {
            return pageCallback(responseData[crudArgs.resultsKey], {
                totalRecords: responseData.totalRecords,
                totalPages: responseData.totalPages,
                perPage: responseData.perPage,
            });
        }
        throw new FetchError("Failed to single page list", response, responseData);
    });
    returnPromise.cancel = () => controller.abort();
    return returnPromise;
}

export async function allPagePaginatedListCrudAdaptor({ crudArgs, listArgs, pageCallback }) {
    const ourListArgs = { p: listArgs?.page || 1, ...omit(listArgs || {}, "p") };
    const controller = new AbortController();
    const url = getListUrl(crudArgs.app, crudArgs.model, makeSearchParamsString(ourListArgs));
    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
    });
    const handleResponse = async (response) => {
        const responseData = await getJsonOrText(response);
        if (!isObject(responseData)) {
            throw new FetchError("Failed to all page list", response, responseData);
        }
        if (response.status === 200) {
            pageCallback(responseData[crudArgs.resultsKey], {
                totalRecords: responseData.totalRecords,
                totalPages: responseData.totalPages,
                perPage: responseData.perPage,
            });
        } else {
            throw new FetchError("Failed to all page list", response, responseData);
        }
        if (responseData.totalPages === 1) {
            return;
        }
        // after the first page, we know the max pages, let's request pages in parallel.
        const limit = pLimit(4);
        controller.signal.addEventListener("abort", () => {
            // on the fly fetches already use the same abort controller, so we don't need to cancel them
            limit.clearQueue();
        });
        const responses = [];
        for (let i = 2; i <= responseData.totalPages; i++) {
            ourListArgs.p = i;
            const url = getListUrl(crudArgs.app, crudArgs.model, makeSearchParamsString(ourListArgs));
            responses.push(
                limit(() =>
                    fetch(url, {
                        method: "GET",
                        credentials: "include",
                        signal: controller.signal,
                    }),
                ),
            );
        }
        // insert the pages in order
        for (let i = 0; i < responses.length; i++) {
            const response = await responses[i];
            const responseData = await getJsonOrText(response);
            if (!isObject(responseData)) {
                throw new FetchError("Failed to all page list", response, responseData);
            }
            if (response.status === 200) {
                pageCallback(responseData[crudArgs.resultsKey], {
                    totalRecords: responseData.totalRecords,
                    totalPages: responseData.totalPages,
                    perPage: responseData.perPage,
                });
            } else {
                throw new FetchError("Failed to all page list", response, responseData);
            }
        }
    };
    /** @type {import('@arrai-innovations/reactive-helpers').CancellablePromise} */
    const returnPromise = handleResponse(response);
    returnPromise.cancel = () => controller.abort();
    return returnPromise;
}

export async function defaultObjectsDelete({ crudArgs, ids }) {
    const abortController = new AbortController();
    const url = getListUrl(crudArgs.app, crudArgs.model, "");
    const returnedPromise = fetch(url, {
        method: "DELETE",
        headers: {
            "X-CSRFToken": getCSRFValue(),
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ pks: ids }),
        signal: abortController.signal,
    }).then(async (response) => {
        if (response.status === 204) {
            return;
        }
        throw new FetchError("Failed to delete object", response, await getJsonOrText(response));
    });
    returnedPromise.cancel = () => abortController.abort();
    return returnedPromise;
}

export function setupDefaultListCrud() {
    setListCrud({
        list: singlePagePaginatedListCrudAdaptor,
        bulkDelete: defaultObjectsDelete,
        args: {
            resultsKey: "results", // all of our current APIs use this key
        },
    });
}
