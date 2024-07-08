import { httpOrHttpsHostname } from "./connectionHostname.js";
import { FetchError } from "./errors.js";
import { getJsonOrText } from "./fetchSupport.js";
import { getUrl } from "./urls.js";
import { setListCrud } from "@arrai-innovations/reactive-helpers";
import isArray from "lodash-es/isArray.js";
import omit from "lodash-es/omit.js";
import pLimit from "p-limit";
import { deepUnref } from "vue-deepunref";

const getListUrl = (app, model, queryString) =>
    `${httpOrHttpsHostname}${getUrl("modelList").replace(":app", app).replace(":model", model)}${queryString}`;

export const makeSearchParamsString = (searchParams) => {
    const params = deepUnref(searchParams);
    if (!params) {
        return "";
    }
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (isArray(value)) {
            value.filter((v) => v !== undefined).forEach((v) => usp.append(key, v));
        } else if (value !== undefined) {
            usp.set(key, value);
        }
    });
    return `?${usp.toString()}`;
};

export function singlePagePaginatedListCrudAdaptor({ crudArgs, listArgs, pageCallback }) {
    const query = makeSearchParamsString(listArgs);
    const controller = new AbortController();
    const url = getListUrl(crudArgs.app, crudArgs.model, query);
    const returnPromise = fetch(url, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
    }).then(async (response) => {
        const responseData = await getJsonOrText(response);
        if (response.status === 200) {
            return pageCallback(responseData[crudArgs.resultsKey], { ...omit(responseData, crudArgs.resultsKey) });
        }
        throw new FetchError("Failed to single page list", response, responseData);
    });
    returnPromise.cancel = () => controller.abort();
    return returnPromise;
}

export async function allPagePaginatedListCrudAdaptor({ crudArgs, listArgs = {}, pageCallback }) {
    const ourListArgs = { p: listArgs.page || 1, ...omit(listArgs, "p") };
    const query = makeSearchParamsString(ourListArgs);
    const controller = new AbortController();
    const url = getListUrl(crudArgs.app, crudArgs.model, query);
    const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
    });
    const handleResponse = async (response) => {
        const responseData = await getJsonOrText(response);
        if (response.status === 200) {
            pageCallback(responseData[crudArgs.resultsKey], { ...omit(responseData, crudArgs.resultsKey) });
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
            const url = getUrl();
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
            if (response.status === 200) {
                pageCallback(responseData[crudArgs.resultsKey], { ...omit(responseData, crudArgs.resultsKey) });
            } else {
                throw new FetchError("Failed to all page list", response, responseData);
            }
        }
    };
    const returnPromise = handleResponse(response);
    returnPromise.cancel = () => controller.abort();
    return returnPromise;
}

export function setupDefaultListCrud() {
    setListCrud({
        list: singlePagePaginatedListCrudAdaptor,
        args: {
            resultsKey: "results", // all of our current APIs use this key
        },
    });
}
