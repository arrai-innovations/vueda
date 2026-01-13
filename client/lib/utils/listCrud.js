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
 * @param {Function} args.pushObjects - Callback to append fetched objects to the current list.
 * @param {Function} args.clearObjects - Callback to clear existing objects when loading a new set.
 * @param {import('vue').Ref<boolean>} args.isCancelled - Reactive flag indicating the request was cancelled.
 * @param {Function} args.setPaginateInfo - Callback to update pagination metadata.
 * @param {Function} args.setColumnTotals - Callback to update column totals metadata.
 * @returns {import('@arrai-innovations/reactive-helpers').CancellablePromise<void>} A cancellable promise.
 */
export function singlePagePaginatedListCrudAdaptor({
    target,
    params,
    pushObjects,
    clearObjects,
    isCancelled,
    setPaginateInfo,
    setColumnTotals,
}) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model, pk, action } = target;
    const query = makeSearchParamsString(params);
    const url = pk ? getDetailUrl({ app, model, pk, action, query }) : getListUrl({ app, model, action, query });
    if (!params?.[PAGE_PARAM] || params?.[PAGE_PARAM] === 1) {
        clearObjects();
    }
    return cancellableFetch(url, { method: "GET", credentials: "include" }, async (response) => {
        const responseData = await getJsonOrText(response);

        if (response.status !== 200) {
            if (isObject(responseData)) {
                const filterParams = Object.keys(omit(params || {}, [PAGE_PARAM, SEARCH_PARAM]));
                if (filterParams.some((key) => key in responseData)) {
                    throw new ListFilterError(response, responseData);
                }
            }
            throw new FetchError("Failed to fetch page list", response, responseData);
        }

        if (isCancelled.value) {
            return;
        }

        setPaginateInfo({
            totalRecords: responseData.totalRecords,
            totalPages: responseData.totalPages,
            perPage: responseData.perPage,
            page: params?.[PAGE_PARAM] || 1,
        });
        setColumnTotals(responseData.columnTotals);
        pushObjects(responseData[target.resultsKey]);
    });
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
 * @param {Function} args.pushObjects - Callback to append fetched objects to the current list.
 * @param {Function} args.clearObjects - Callback to clear existing objects when loading a new set.
 * @param {import('vue').Ref<boolean>} args.isCancelled - Reactive flag indicating the request was cancelled.
 * @param {Function} args.setPaginateInfo - Callback to update pagination metadata.
 * @param {Function} args.setColumnTotals - Callback to update column totals metadata.
 * @returns {import('@arrai-innovations/reactive-helpers').CancellablePromise<void>} - A cancellable promise.
 */
export function allPagePaginatedListCrudAdaptor({
    target,
    params,
    pushObjects,
    clearObjects,
    isCancelled,
    setPaginateInfo,
    setColumnTotals,
}) {
    const { app, model, pk, action } = target;
    const baseUrl = pk ? getDetailUrl({ app, model, pk, action }) : getListUrl({ app, model, action });
    if (params.page === 1) {
        clearObjects();
    }
    const controller = new AbortController();
    const limit = pLimit(4);
    const running = [];
    const fetchPages = async () => {
        const ourParams = { [PAGE_PARAM]: 1, ...omit(params || {}, PAGE_PARAM) };
        const firstUrl = `${baseUrl}${makeSearchParamsString(ourParams)}`;

        const firstResp = await fetch(firstUrl, {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
        });

        const firstData = await getJsonOrText(firstResp);
        if (firstResp.status !== 200) {
            if (isObject(firstData)) {
                const filterParams = Object.keys(omit(params || {}, [PAGE_PARAM, SEARCH_PARAM]));
                if (filterParams.some((key) => key in firstData)) {
                    throw new ListFilterError(firstResp, firstData);
                }
            }
            throw new FetchError("Failed to fetch all page list", firstResp, firstData);
        }

        if (isCancelled.value) {
            return;
        }
        clearObjects();
        pushObjects(firstData[target.resultsKey]);

        const totalPages = firstData.totalPages ?? 1;
        setPaginateInfo({
            totalRecords: firstData.totalRecords,
            totalPages,
            perPage: firstData.perPage,
            page: 1,
        });
        setColumnTotals(firstData.columnTotals);
        if (totalPages > 1) {
            for (let page = 2; page <= totalPages; page++) {
                ourParams[PAGE_PARAM] = page;
                const nextUrl = `${baseUrl}${makeSearchParamsString(ourParams)}`;

                running.push(
                    limit(async () => {
                        const resp = await fetch(nextUrl, {
                            method: "GET",
                            credentials: "include",
                            signal: controller.signal,
                        });
                        const data = await getJsonOrText(resp);
                        if (resp.status !== 200 || !isObject(data)) {
                            throw new FetchError("Failed to fetch additional page", resp, data);
                        }
                        if (!isCancelled.value) {
                            pushObjects(data[target.resultsKey]);
                            setPaginateInfo({
                                totalRecords: data.totalRecords,
                                totalPages: data.totalPages,
                                perPage: data.perPage,
                                page,
                            });
                            setColumnTotals(firstData.columnTotals);
                        }
                    }),
                );
            }
            await Promise.all(running);
        }
    };

    return CancellablePromise(fetchPages(), async () => {
        controller.abort();
        await Promise.allSettled(running).catch(() => {});
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
 * @param {string[]} args.pks - The PKs of the objects to delete.
 * @param {boolean} [args.dryRun] - When true, sends the request in dry-run mode.
 * @returns {import('@arrai-innovations/reactive-helpers').CancellablePromise<void>} - A cancellable promise.
 */
export function defaultObjectsDelete({ target, pks, dryRun }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model, action } = target;
    const url = getListUrl({ app, model, action });
    const headers = {
        "X-CSRFToken": getCSRFValue(),
        "Content-Type": "application/json",
    };
    if (dryRun) {
        headers["Dry-Run"] = "true";
    }
    return cancellableFetch(
        url,
        {
            method: "DELETE",
            credentials: "include",
            headers,
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
