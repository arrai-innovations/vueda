import { CancellablePromise, cancellableFetch, deepUnref, setListCrud } from "@arrai-innovations/reactive-helpers";
import { PAGE_PARAM, SEARCH_PARAM } from "@vueda/utils/constants.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError, FormValidationError, ListFilterError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { getDetailUrl, getListUrl } from "@vueda/utils/urls.js";
import isObject from "lodash-es/isObject.js";
import omit from "lodash-es/omit.js";
import pLimit from "p-limit";

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
 * The VUEDA specific implementation for reactive-helper's list crud function, for a specific page.
 * Supports fetching from a standard list or a custom detail action.
 *
 * @param {object} args - The arguments object.
 * @param {{
 *     app: string,
 *     model: string,
 *     pk?: string,
 *     action?: string,
 * }} args.target - The arguments for the CRUD operation. If `pk` and `action` are provided, the detail action url will be used.
 *  Otherwise, the non-detail list url will be used.
 * @param {object} args.params - The arguments for the list operation.
 * @param args.pageCallback {(
 *     newObjects: import('@arrai-innovations/reactive-helpers').ListObject[],
 *     pageData: {
 *         totalRecords: number,
 *         totalPages: number,
 *         perPage: number,
 *     }
 * ) => void} - The callback function to call with the page data.
 * @returns {import('@arrai-innovations/reactive-helpers').CancellablePromise<void>} A cancellable promise.
 */
export function singlePagePaginatedListCrudAdaptor({ target, params, pageCallback }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model, pk, action } = target;
    const query = makeSearchParamsString(params);
    const url = pk ? getDetailUrl({ app, model, pk, action, query }) : getListUrl({ app, model, action, query });

    return cancellableFetch(
        url,
        {
            method: "GET",
            credentials: "include",
        },
        async (response) => {
            const responseData = await getJsonOrText(response);
            if (response.status !== 200) {
                if (isObject(responseData)) {
                    const filterParams = Object.keys(omit(params || {}, [PAGE_PARAM, SEARCH_PARAM]));
                    if (isObject(responseData) && filterParams.some((key) => key in responseData)) {
                        throw new ListFilterError(response, responseData);
                    }
                }
                throw new FetchError("Failed to fetch page list", response, responseData);
            }

            pageCallback(responseData[target.resultsKey], {
                totalRecords: responseData.totalRecords,
                totalPages: responseData.totalPages,
                perPage: responseData.perPage,
                page: params?.[PAGE_PARAM] || 1,
            });
        },
    );
}

/**
 * The VUEDA specific implementation for reactive-helper's list crud function, for all pages.
 *
 * @param args {object} - The arguments object.
 * @param args.target {{
 *     app: string,
 *     model: string,
 *     pk?: string,
 *     action?: string,
 * }} - VUEDA specific arguments for the CRUD operation.
 * @param args.params {{ [p]: number }} - The querystring parameters for the list operation.
 * @param args.pageCallback {(
 *     newObjects: import('@arrai-innovations/reactive-helpers').ListObject[],
 *     pageData: {
 *         totalRecords: number,
 *         totalPages: number,
 *         perPage: number,
 *     }
 * ) => void} - The callback function to call with the page data.
 * @returns {import('@arrai-innovations/reactive-helpers').CancellablePromise<void>} - A cancellable promise.
 */
export function allPagePaginatedListCrudAdaptor({ target, params, pageCallback }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the requests. ###
    const { app, model, pk, action } = target;
    const ourParams = { [PAGE_PARAM]: 1, ...omit(params || {}, PAGE_PARAM) };
    const query = makeSearchParamsString(ourParams);
    const controller = new AbortController();
    const url = pk ? getDetailUrl({ app, model, pk, action }) : getListUrl({ app, model, action });
    const limit = pLimit(4);
    const responses = [];

    // we don't use cancellableFetch here because we need to cancel all requests, not just the first one
    const fetchPages = async () => {
        const response = await fetch(`${url}${query}`, {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
        });

        const responseData = await getJsonOrText(response);
        if (response.status !== 200) {
            if (isObject(responseData)) {
                const filterParams = Object.keys(omit(params || {}, [PAGE_PARAM, SEARCH_PARAM]));
                if (isObject(responseData) && filterParams.some((key) => key in responseData)) {
                    throw new ListFilterError(response, responseData);
                }
            }
            throw new FetchError("Failed to all page list", response, responseData);
        }

        pageCallback(responseData[target.resultsKey], {
            totalRecords: responseData.totalRecords,
            totalPages: responseData.totalPages,
            perPage: responseData.perPage,
            page: 1,
        });

        if (responseData.totalPages > 1) {
            for (let i = 2; i <= responseData.totalPages; i++) {
                const page = i;
                ourParams[PAGE_PARAM] = page;
                const nextQuery = makeSearchParamsString(ourParams);
                responses.push(
                    limit(() =>
                        fetch(`${url}${nextQuery}`, {
                            method: "GET",
                            credentials: "include",
                            signal: controller.signal,
                        }).then(async (response) => {
                            const data = await getJsonOrText(response);
                            if (response.status === 200 && isObject(data)) {
                                pageCallback(data[target.resultsKey], {
                                    totalRecords: data.totalRecords,
                                    totalPages: data.totalPages,
                                    perPage: data.perPage,
                                    page: page,
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

    return CancellablePromise(fetchPages(), async () => {
        controller.abort();
        await Promise.allSettled(responses).catch(() => {});
    });
}

/**
 * The VUEDA specific implementation for reactive-helper's list bulk delete crud function.
 *
 * @param {object} args - The arguments object.
 * @param {{
 *    app: string,
 *    model: string,
 *    action?: string,
 * }} args.target - The arguments for the CRUD operation.
 * @param pks {string[]} - The PKs of the objects to delete.
 * @returns {import('@arrai-innovations/reactive-helpers').CancellablePromise<void>} - A cancellable promise.
 */
export function defaultObjectsDelete({ target, pks }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model, action } = target;
    const url = getListUrl({ app, model, action });

    return cancellableFetch(
        url,
        {
            method: "DELETE",
            credentials: "include",
            headers: {
                "X-CSRFToken": getCSRFValue(),
                "Content-Type": "application/json",
            },
            // VUEDA's bulk functionality customization of destroy always take pks, regardless of the name of the pk key
            // reactive-helpers provides the pkKey in our args, but we ignore it.
            body: JSON.stringify({ pks }),
        },
        async (response) => {
            const responseData = await getJsonOrText(response);
            if (response.status === 204) {
                return;
            }
            if (response.status === 400) {
                throw new FormValidationError(responseData, response);
            }
            throw new FetchError("Failed to delete object", response, responseData);
        },
    );
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
