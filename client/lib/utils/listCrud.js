import { setListCrud } from "@arrai-innovations/reactive-helpers";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { getDetailUrl, getListUrl } from "@vueda/utils/urls.js";
import { isObject } from "lodash-es";
import isArray from "lodash-es/isArray.js";
import omit from "lodash-es/omit.js";
import pLimit from "p-limit";
import { deepUnref } from "vue-deepunref";

/**
 * Make a search params string from the given search params object.
 *
 * @param searchParams {object} - The search params object.
 * @returns {string} - The search params string.
 */
export const makeSearchParamsString = (searchParams) => {
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
 * The VUEDA specific implementation for reactive-helper's list crud function, for a specific page.
 * Supports fetching from a standard list or a custom detail action.
 *
 * @param {object} args - The arguments object.
 * @param {{
 *     app: string,
 *     model: string,
 *     pk?: string,
 *     action?: string,
 * }} args.crudArgs - The arguments for the CRUD operation. If `pk` and `action` are provided, the detail action url will be used.
 *  Otherwise, the non-detail list url will be used.
 * @param {object} args.listArgs - The arguments for the list operation.
 * @param args.pageCallback {(
 *     newObjects: import('@arrai-innovations/reactive-helpers').ListObject[],
 *     pageData: {
 *         totalRecords: number,
 *         totalPages: number,
 *         perPage: number,
 *     }
 * ) => void} - The callback function to call with the page data.
 * @returns {Promise<void> & { cancel: () => Promise<void> }} A cancellable promise.
 */
export function singlePagePaginatedListCrudAdaptor({ crudArgs, listArgs, pageCallback }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model, pk, action } = crudArgs;
    const query = makeSearchParamsString(listArgs);
    const controller = new AbortController();
    const url = pk ? getDetailUrl({ app, model, pk, action, query }) : getListUrl({ app, model, action, query });

    const returnPromise = fetch(url, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
    }).then(async (response) => {
        const responseData = await getJsonOrText(response);
        if (!isObject(responseData)) {
            throw new FetchError("Failed to fetch page list", response, responseData);
        }
        if (response.status === 200) {
            return pageCallback(responseData[crudArgs.resultsKey], {
                totalRecords: responseData.totalRecords,
                totalPages: responseData.totalPages,
                perPage: responseData.perPage,
            });
        }
        throw new FetchError("Failed to fetch page list", response, responseData);
    });

    returnPromise.cancel = async () => {
        controller.abort();
        await returnPromise.catch(() => {});
    };

    return returnPromise;
}

/**
 * The VUEDA specific implementation for reactive-helper's list crud function, for all pages.
 *
 * @param args {object} - The arguments object.
 * @param args.crudArgs {{
 *     app: string,
 *     model: string,
 *     pk?: string,
 *     action?: string,
 * }} - VUEDA specific arguments for the CRUD operation.
 * @param args.listArgs {{ [p]: number }} - The querystring parameters for the list operation.
 * @param args.pageCallback {(
 *     newObjects: import('@arrai-innovations/reactive-helpers').ListObject[],
 *     pageData: {
 *         totalRecords: number,
 *         totalPages: number,
 *         perPage: number,
 *     }
 * ) => void} - The callback function to call with the page data.
 * @returns {Promise<void> & { cancel: () => Promise<void> }} - A cancellable promise.
 */
export function allPagePaginatedListCrudAdaptor({ crudArgs, listArgs, pageCallback }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the requests. ###
    const { app, model, pk, action } = crudArgs;
    const ourListArgs = { p: listArgs?.page || 1, ...omit(listArgs || {}, "p") };
    const query = makeSearchParamsString(ourListArgs);
    const controller = new AbortController();
    const url = pk ? getDetailUrl({ app, model, pk, action }) : getListUrl({ app, model, action });
    const limit = pLimit(4);
    const responses = [];

    const fetchPages = async () => {
        const response = await fetch(`${url}${query}`, {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
        });

        const responseData = await getJsonOrText(response);
        if (!isObject(responseData) || response.status !== 200) {
            throw new FetchError("Failed to all page list", response, responseData);
        }

        pageCallback(responseData[crudArgs.resultsKey], {
            totalRecords: responseData.totalRecords,
            totalPages: responseData.totalPages,
            perPage: responseData.perPage,
        });

        if (responseData.totalPages > 1) {
            for (let i = 2; i <= responseData.totalPages; i++) {
                ourListArgs.p = i;
                const nextQuery = makeSearchParamsString(ourListArgs);
                responses.push(
                    limit(() =>
                        fetch(`${url}${nextQuery}`, {
                            method: "GET",
                            credentials: "include",
                            signal: controller.signal,
                        }).then(async (response) => {
                            const data = await getJsonOrText(response);
                            if (response.status === 200 && isObject(data)) {
                                pageCallback(data[crudArgs.resultsKey], {
                                    totalRecords: data.totalRecords,
                                    totalPages: data.totalPages,
                                    perPage: data.perPage,
                                });
                            } else {
                                throw new FetchError("Failed to fetch additional page", response, data);
                            }
                        }),
                    ),
                );
            }
        }
    };

    const returnPromise = fetchPages();
    returnPromise.cancel = async () => {
        controller.abort();
        await Promise.allSettled(responses).catch(() => {});
    };

    return returnPromise;
}

/**
 * The VUEDA specific implementation for reactive-helper's list bulk delete crud function.
 *
 * @param {object} args - The arguments object.
 * @param {{
 *    app: string,
 *    model: string,
 *    action?: string,
 * }} args.crudArgs - The arguments for the CRUD operation.
 * @param pks {string[]} - The PKs of the objects to delete.
 * @returns {Promise<void> & { cancel: () => Promise<void> }} - A cancellable promise.
 */
export function defaultObjectsDelete({ crudArgs, pks }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model, action } = crudArgs;
    const controller = new AbortController();
    const url = getListUrl({ app, model, action });

    const returnPromise = fetch(url, {
        method: "DELETE",
        headers: {
            "X-CSRFToken": getCSRFValue(),
            "Content-Type": "application/json",
        },
        credentials: "include",
        // VUEDA's bulk functionality customization of destroy always take pks, regardless of the name of the pk key
        // reactive-helpers provides the pkKey in our args, but we ignore it.
        body: JSON.stringify({ pks }),
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

export function setupDefaultListCrud() {
    setListCrud({
        list: singlePagePaginatedListCrudAdaptor,
        bulkDelete: defaultObjectsDelete,
        args: {
            resultsKey: "results", // all of our current APIs use this key
        },
    });
}
