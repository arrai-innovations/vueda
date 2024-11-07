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

/**
 * Get the URL for a list view.
 *
 * @param app {string} - The app name.
 * @param model {string} - The model name.
 * @param queryString {string} - The query string.
 * @returns {string} - The URL.
 */
export const getListUrl = (app, model, queryString) =>
    `${httpOrHttpsHostname}${getUrl("modelList").replace(":app", getServerRoutePart(app)).replace(":model", getServerRoutePart(model))}${queryString}`;

/**
 * Get the URL for a detail view.
 *
 * @param app {string} - The app name.
 * @param model {string} - The model name.
 * @param actionName {string} - The action name.
 * @returns {string} - The URL.
 */
export const getActionUrl = (app, model, actionName) =>
    `${httpOrHttpsHostname}${getUrl("modelAction").replace(":app", getServerRoutePart(app)).replace(":model", getServerRoutePart(model)).replace(":action_name", actionName)}`;

/**
 * Get the URL for a detail action.
 *
 * @param app {string} - The app name.
 * @param model {string} - The model name.
 * @param pk {string} - The primary key.
 * @param actionName {string} - The action name.
 * @param queryString {string} - The query string.
 * @returns {string} - The URL.
 */
export const getDetailActionUrl = (app, model, pk, actionName, queryString) =>
    `${httpOrHttpsHostname}${getUrl("modelDetailAction").replace(":app", getServerRoutePart(app)).replace(":model", getServerRoutePart(model)).replace(":pk", pk).replace(":action_name", actionName)}${queryString}`;

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
 * @param {(newObjects: import('@arrai-innovations/reactive-helpers').ListObject[], pageData: {
 *     totalRecords: number,
 *     totalPages: number,
 *     perPage: number,
 * }) => void} args.pageCallback - The callback function to call with the page data.
 * @returns {Promise<void> & { cancel: () => Promise<void> }} A cancellable promise.
 */
export function singlePagePaginatedListCrudAdaptor({ crudArgs, listArgs, pageCallback }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const { app, model, pk, action } = crudArgs;
    const query = makeSearchParamsString(listArgs);
    const controller = new AbortController();
    const url = pk && action ? getDetailActionUrl(app, model, pk, action, query) : getListUrl(app, model, query);

    /** @type {Promise<void> & { cancel: () => Promise<void> }} */
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
 * @param args.crudArgs {{ app:string, model:string }} - VUEDA specific arguments for the CRUD operation.
 * @param listArgs {{ [p]: number }} - The querystring parameters for the list operation.
 * @param pageCallback {{newObjects: import('@arrai-innovations/reactive-helpers').ListObject[], pageData: {
 *     totalRecords: number,
 *     totalPages: number,
 *     perPage: number,
 * }}} - The callback function to call with the page data.
 * @returns {Promise<void> & { cancel: () => Promise<void> }} - A cancellable promise.
 */
export function allPagePaginatedListCrudAdaptor({ crudArgs, listArgs, pageCallback }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the requests. ###
    const ourListArgs = { p: listArgs?.page || 1, ...omit(listArgs || {}, "p") };
    const controller = new AbortController();
    const url = getListUrl(crudArgs.app, crudArgs.model, makeSearchParamsString(ourListArgs));
    const limit = pLimit(4);
    const responses = [];

    const fetchPages = async () => {
        const response = await fetch(url, {
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
                const pageUrl = getListUrl(crudArgs.app, crudArgs.model, makeSearchParamsString(ourListArgs));
                responses.push(
                    limit(() =>
                        fetch(pageUrl, {
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

    /** @type {Promise<void> & { cancel: () => Promise<void> }} */
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
 * }} args.crudArgs - The arguments for the CRUD operation.
 * @param pks {string[]} - The PKs of the objects to delete.
 * @returns {Promise<void> & { cancel: () => Promise<void> }} - A cancellable promise.
 */
export function defaultObjectsDelete({ crudArgs, pks }) {
    // ### This function cannot be async, or we'll lose the ability to cancel the request. ###
    const controller = new AbortController();
    const url = getListUrl(crudArgs.app, crudArgs.model, "");

    /** @type {Promise<void> & { cancel: () => Promise<void> }} */
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
