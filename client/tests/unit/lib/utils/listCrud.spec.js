import { scopedIt } from "@tests/unit/utils.js";
import { COLUMN_TOTALS_PARAM, PAGE_PARAM } from "@vueda/utils/constants.js";

const getDetailUrl = vi.fn();
const getListUrl = vi.fn();
vi.mock("@vueda/utils/urls.js", () => ({
    getDetailUrl,
    getListUrl,
}));

const getJsonOrText = vi.fn();
// Only `getJsonOrText` is stubbed: the paging adaptors below feed it hand-rolled response objects, while
// `actionRequestHeaders` and `readActionResponse` stay real so the action handlers are tested against the
// classification they actually ship with.
vi.mock("@vueda/utils/fetchSupport.js", async () => {
    const actual = await vi.importActual("@vueda/utils/fetchSupport.js");
    return { ...actual, getJsonOrText };
});

const getCSRFValue = vi.fn(() => "csrf");
vi.mock("@vueda/utils/csrf.js", () => ({
    getCSRFValue,
}));

const cancellableFetch = vi.fn();
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { __esModule: true, ...actual, cancellableFetch };
});

const pLimitMock = vi.fn(() => (fn) => fn());
vi.mock("p-limit", () => ({ default: pLimitMock }));

describe("lib/utils/listCrud.js", () => {
    let listCrud;
    beforeEach(async () => {
        listCrud = await import("@vueda/utils/listCrud.js");
        cancellableFetch.mockReset();
        getDetailUrl.mockReset();
        getListUrl.mockReset();
        getJsonOrText.mockReset();
        getCSRFValue.mockClear();
        pLimitMock.mockClear();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("makeSearchParamsString handles arrays and undefined", () => {
        const { makeSearchParamsString } = listCrud;
        const result = makeSearchParamsString({ a: 1, b: [2, undefined, 3], c: undefined });
        expect(result).toBe("?a=1&b=2%2C3");
    });

    scopedIt("singlePagePaginatedListCrudAdaptor fetches one page", async () => {
        const { singlePagePaginatedListCrudAdaptor } = listCrud;
        const target = { app: "blog", model: "post", resultsKey: "items" };
        const params = { [PAGE_PARAM]: 2 };
        getListUrl.mockReturnValue("/list/?p=2");
        const response = { status: 200 };
        getJsonOrText.mockResolvedValue({ items: [1], totalRecords: 1, totalPages: 1, perPage: 10 });
        const pushObjects = vi.fn();
        const clearObjects = vi.fn();
        const setPaginateInfo = vi.fn();
        const setColumnTotals = vi.fn();
        const isCancelled = { value: false };
        cancellableFetch.mockImplementation((url, options, transform) => {
            expect(getListUrl).toHaveBeenCalledWith({
                app: "blog",
                model: "post",
                action: undefined,
                query: "?p=2",
            });
            expect(url).toBe("/list/?p=2");
            expect(options).toEqual({ method: "GET", credentials: "include" });
            return Promise.resolve(transform(response));
        });
        await singlePagePaginatedListCrudAdaptor({
            target,
            params,
            pushObjects,
            clearObjects,
            isCancelled,
            setPaginateInfo,
            setColumnTotals,
        });
        expect(pushObjects).toHaveBeenCalledWith([1]);
        expect(setPaginateInfo).toHaveBeenCalledWith({ totalRecords: 1, totalPages: 1, perPage: 10, page: 2 });
        expect(setColumnTotals).toHaveBeenCalledWith(undefined);
    });

    scopedIt("singlePagePaginatedListCrudAdaptor raises a rejected total as a plain fetch error", async () => {
        // A `400` keyed by a filter name is a `ListFilterError`, which the filter form renders
        // against the widget that produced it and `useViewList` keeps out of the view's own error
        // state. The totals parameter has no widget, so classifying its rejection that way would
        // leave the list empty with nothing reporting why.
        const { singlePagePaginatedListCrudAdaptor } = listCrud;
        const { FetchError, ListFilterError } = await import("@vueda/utils/errors.js");
        getListUrl.mockReturnValue("/list/");
        getJsonOrText.mockResolvedValue({ [COLUMN_TOTALS_PARAM]: ["Invalid column total 'prcie'."] });
        cancellableFetch.mockImplementation((url, options, transform) => Promise.resolve(transform({ status: 400 })));

        const request = singlePagePaginatedListCrudAdaptor({
            target: { app: "blog", model: "post", resultsKey: "items" },
            params: { [COLUMN_TOTALS_PARAM]: ["prcie"] },
            pushObjects: vi.fn(),
            clearObjects: vi.fn(),
            isCancelled: { value: false },
            setPaginateInfo: vi.fn(),
            setColumnTotals: vi.fn(),
        });

        await expect(request).rejects.toBeInstanceOf(FetchError);
        await expect(request).rejects.not.toBeInstanceOf(ListFilterError);
    });

    scopedIt("allPagePaginatedListCrudAdaptor fetches multiple pages", async () => {
        const { allPagePaginatedListCrudAdaptor } = listCrud;
        const target = { app: "blog", model: "post", resultsKey: "items" };
        getListUrl.mockReturnValue("/list");
        const response1 = { status: 200 };
        const response2 = { status: 200 };
        global.fetch = vi.fn().mockResolvedValueOnce(response1).mockResolvedValueOnce(response2);
        getJsonOrText
            .mockResolvedValueOnce({
                items: ["a"],
                totalRecords: 2,
                totalPages: 2,
                perPage: 1,
                columnTotals: { hours: 3 },
            })
            .mockResolvedValueOnce({
                items: ["b"],
                totalRecords: 2,
                totalPages: 2,
                perPage: 1,
                columnTotals: { hours: 999 },
            });
        const pushObjects = vi.fn();
        const clearObjects = vi.fn();
        const setPaginateInfo = vi.fn();
        const setColumnTotals = vi.fn();
        const isCancelled = { value: false };
        await allPagePaginatedListCrudAdaptor({
            target,
            params: {},
            pushObjects,
            clearObjects,
            isCancelled,
            setPaginateInfo,
            setColumnTotals,
        });
        await Promise.resolve();
        await Promise.resolve();
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(pushObjects).toHaveBeenNthCalledWith(1, ["a"]);
        expect(pushObjects).toHaveBeenNthCalledWith(2, ["b"]);
        expect(setPaginateInfo).toHaveBeenNthCalledWith(1, { totalRecords: 2, totalPages: 2, perPage: 1, page: 1 });
        expect(setPaginateInfo).toHaveBeenNthCalledWith(2, { totalRecords: 2, totalPages: 2, perPage: 1, page: 2 });
        expect(setColumnTotals).toHaveBeenCalledExactlyOnceWith({ hours: 3 });
    });

    scopedIt("allPagePaginatedListCrudAdaptor asks for column totals on the first page only", async () => {
        // The server aggregates over the whole filtered set, so every page would come back with the
        // same totals -- at the cost of a `SUM` per requested total, per page. Only the first
        // response's totals are read, so the rest of the pages do not ask.
        const { allPagePaginatedListCrudAdaptor } = listCrud;
        const target = { app: "blog", model: "post", resultsKey: "items" };
        getListUrl.mockReturnValue("/list");
        global.fetch = vi.fn().mockResolvedValue({ status: 200 });
        getJsonOrText
            .mockResolvedValueOnce({ items: ["a"], totalRecords: 3, totalPages: 3, perPage: 1, columnTotals: {} })
            .mockResolvedValue({ items: ["b"], totalRecords: 3, totalPages: 3, perPage: 1, columnTotals: {} });
        await allPagePaginatedListCrudAdaptor({
            target,
            params: { [COLUMN_TOTALS_PARAM]: ["hours"] },
            pushObjects: vi.fn(),
            clearObjects: vi.fn(),
            isCancelled: { value: false },
            setPaginateInfo: vi.fn(),
            setColumnTotals: vi.fn(),
        });
        await Promise.resolve();
        await Promise.resolve();

        const urls = global.fetch.mock.calls.map(([url]) => url);
        expect(urls).toHaveLength(3);
        expect(urls[0]).toContain(`${COLUMN_TOTALS_PARAM}=hours`);
        expect(urls[1]).not.toContain(`${COLUMN_TOTALS_PARAM}=`);
        expect(urls[2]).not.toContain(`${COLUMN_TOTALS_PARAM}=`);
    });

    scopedIt("allPagePaginatedListCrudAdaptor clears objects before fetching", async () => {
        const { allPagePaginatedListCrudAdaptor } = listCrud;
        const target = { app: "blog", model: "post", resultsKey: "items" };
        getListUrl.mockReturnValue("/list");
        const response = { status: 200 };
        let resolveFetch;
        global.fetch = vi.fn(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve;
                }),
        );
        getJsonOrText.mockResolvedValue({ items: ["a"], totalRecords: 1, totalPages: 1, perPage: 1 });
        const clearObjects = vi.fn();

        const request = allPagePaginatedListCrudAdaptor({
            target,
            params: { [PAGE_PARAM]: 1 },
            pushObjects: vi.fn(),
            clearObjects,
            isCancelled: { value: false },
            setPaginateInfo: vi.fn(),
            setColumnTotals: vi.fn(),
        });

        expect(clearObjects).toHaveBeenCalledOnce();
        resolveFetch(response);
        await request;
        expect(clearObjects).toHaveBeenCalledOnce();
    });

    describe("defaultObjectsDelete", () => {
        /**
         * @param {Response} response - The response the fetch resolves.
         * @returns {object[]} The url and options `cancellableFetch` was called with.
         */
        function captureDelete(response) {
            const captured = [];
            cancellableFetch.mockImplementation((url, options, transform) => {
                captured.push({ url, options });
                return Promise.resolve(transform(response));
            });
            return captured;
        }

        scopedIt("sends the pks to the list url with csrf", async () => {
            getListUrl.mockReturnValue("/list");
            const captured = captureDelete(new Response(null, { status: 204 }));

            await listCrud.defaultObjectsDelete({ target: { app: "blog", model: "post" }, pks: ["1", "2"] });

            expect(captured[0].url).toBe("/list");
            expect(captured[0].options).toMatchObject({
                method: "DELETE",
                credentials: "include",
                headers: { "X-CSRFToken": "csrf", "Content-Type": "application/json" },
            });
            expect(JSON.parse(captured[0].options.body)).toEqual({ pks: ["1", "2"] });
        });

        scopedIt("merges extra form fields into the body", async () => {
            getListUrl.mockReturnValue("/list");
            const captured = captureDelete(new Response(null, { status: 204 }));

            await listCrud.defaultObjectsDelete({
                target: { app: "blog", model: "post" },
                pks: ["1"],
                formData: { reason: "spam" },
            });

            expect(JSON.parse(captured[0].options.body)).toEqual({ pks: ["1"], reason: "spam" });
        });

        scopedIt("sets Dry-Run header when requested", async () => {
            getListUrl.mockReturnValue("/list");
            const captured = captureDelete(new Response(null, { status: 204 }));

            await listCrud.defaultObjectsDelete({
                target: { app: "blog", model: "post" },
                pks: ["1", "2"],
                dryRun: true,
            });

            expect(captured[0].options.headers["Dry-Run"]).toBe("true");
        });

        scopedIt("accepts the server's dry-run 200", async () => {
            getListUrl.mockReturnValue("/list");
            captureDelete(new Response(JSON.stringify({ warnings: {} }), { status: 200 }));

            await expect(
                listCrud.defaultObjectsDelete({ target: { app: "blog", model: "post" }, pks: ["1"], dryRun: true }),
            ).resolves.toEqual({ warnings: {} });
        });

        scopedIt("treats a 200 on a real delete as a failure", async () => {
            const { FetchError } = await import("@vueda/utils/errors.js");
            getListUrl.mockReturnValue("/list");
            captureDelete(new Response(JSON.stringify({}), { status: 200 }));

            // Only a 204 confirms a delete happened. A 200 here means the server answered something else,
            // which must not read as success just because the status is in the 2xx range.
            await expect(
                listCrud.defaultObjectsDelete({ target: { app: "blog", model: "post" }, pks: ["1"] }),
            ).rejects.toBeInstanceOf(FetchError);
        });

        scopedIt("sets Acknowledge-Warnings header when a digest is acknowledged", async () => {
            getListUrl.mockReturnValue("/list");
            const captured = captureDelete(new Response(null, { status: 204 }));

            await listCrud.defaultObjectsDelete({
                target: { app: "blog", model: "post" },
                pks: ["1", "2"],
                acknowledgeWarnings: "d1",
            });

            expect(captured[0].options.headers["Acknowledge-Warnings"]).toBe("d1");
        });

        scopedIt("omits Acknowledge-Warnings header when no digest is acknowledged", async () => {
            getListUrl.mockReturnValue("/list");
            const captured = captureDelete(new Response(null, { status: 204 }));

            await listCrud.defaultObjectsDelete({ target: { app: "blog", model: "post" }, pks: ["1", "2"] });

            expect(captured[0].options.headers["Acknowledge-Warnings"]).toBeUndefined();
        });

        scopedIt("throws FormValidationError on 400", async () => {
            const { FormValidationError } = await import("@vueda/utils/errors.js");
            getListUrl.mockReturnValue("/list");
            captureDelete(new Response(JSON.stringify({ name: ["Required."] }), { status: 400 }));

            await expect(
                listCrud.defaultObjectsDelete({ target: { app: "blog", model: "post" }, pks: ["1"] }),
            ).rejects.toBeInstanceOf(FormValidationError);
        });

        scopedIt("throws ConfirmationRequiredError on 409", async () => {
            const { ConfirmationRequiredError } = await import("@vueda/utils/errors.js");
            getListUrl.mockReturnValue("/list");
            const responseData = { confirmation_required: true, digest: "d1", warnings: { count: ["unusual"] } };
            captureDelete(new Response(JSON.stringify(responseData), { status: 409 }));

            const error = await listCrud
                .defaultObjectsDelete({ target: { app: "blog", model: "post" }, pks: ["1", "2"] })
                .catch((e) => e);

            expect(error).toBeInstanceOf(ConfirmationRequiredError);
            expect(error.digest).toBe("d1");
            expect(error.messages).toEqual({ count: ["unusual"] });
            expect(error.bulk).toBe(true);
        });
    });

    describe("defaultListExecuteAction", () => {
        scopedIt("sends the action to the list action url with the pks", async () => {
            getListUrl.mockReturnValue("/list/archive/");
            let captured;
            cancellableFetch.mockImplementation((url, options, transform) => {
                captured = { url, options };
                return Promise.resolve(transform(new Response(JSON.stringify({ archived: 2 }), { status: 200 })));
            });

            const result = await listCrud.defaultListExecuteAction({
                target: { app: "blog", model: "post" },
                pks: ["1", "2"],
                action: "archive",
                requestMethod: "PATCH",
                formData: { reason: "stale" },
                dryRun: true,
                acknowledgeWarnings: "d1",
            });

            expect(getListUrl).toHaveBeenCalledWith({ app: "blog", model: "post", action: "archive" });
            expect(captured.options).toMatchObject({ method: "PATCH", credentials: "include" });
            expect(captured.options.headers).toMatchObject({ "Dry-Run": "true", "Acknowledge-Warnings": "d1" });
            expect(JSON.parse(captured.options.body)).toEqual({ pks: ["1", "2"], reason: "stale" });
            expect(result).toEqual({ archived: 2 });
        });

        scopedIt("defaults to PUT", async () => {
            getListUrl.mockReturnValue("/list/archive/");
            let captured;
            cancellableFetch.mockImplementation((url, options, transform) => {
                captured = { url, options };
                return Promise.resolve(transform(new Response(null, { status: 204 })));
            });

            await listCrud.defaultListExecuteAction({
                target: { app: "blog", model: "post" },
                pks: ["1"],
                action: "archive",
            });

            expect(captured.options.method).toBe("PUT");
        });

        scopedIt("throws ConfirmationRequiredError with bulk:true on 409, even for a one-pk bulk request", async () => {
            const { ConfirmationRequiredError } = await import("@vueda/utils/errors.js");
            getListUrl.mockReturnValue("/list/archive/");
            const responseData = {
                confirmation_required: true,
                digest: "d2",
                warnings: { 1: { count: ["unusual"] } },
            };
            cancellableFetch.mockImplementation((url, options, transform) =>
                transform(new Response(JSON.stringify(responseData), { status: 409 })),
            );

            const error = await listCrud
                .defaultListExecuteAction({
                    target: { app: "blog", model: "post" },
                    pks: ["1"],
                    action: "archive",
                })
                .catch((e) => e);

            expect(error).toBeInstanceOf(ConfirmationRequiredError);
            expect(error.bulk).toBe(true);
            expect(error.messages).toEqual({ 1: { count: ["unusual"] } });
        });
    });

    describe("setupDefaultListCrud", () => {
        scopedIt("registers list, bulkDelete, and executeAction", async () => {
            const rh = await import("@arrai-innovations/reactive-helpers");

            listCrud.setupDefaultListCrud();

            expect(rh.defaultListCrud.list).toBe(listCrud.singlePagePaginatedListCrudAdaptor);
            expect(rh.defaultListCrud.bulkDelete).toBe(listCrud.defaultObjectsDelete);
            expect(rh.defaultListCrud.executeAction).toBe(listCrud.defaultListExecuteAction);
        });
    });
});
