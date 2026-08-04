import { scopedIt } from "@tests/unit/utils.js";
import { PAGE_PARAM } from "@vueda/utils/constants.js";

const getDetailUrl = vi.fn();
const getListUrl = vi.fn();
vi.mock("@vueda/utils/urls.js", () => ({
    getDetailUrl,
    getListUrl,
}));

const getJsonOrText = vi.fn();
vi.mock("@vueda/utils/fetchSupport.js", () => ({
    getJsonOrText,
}));

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

    scopedIt("defaultObjectsDelete uses cancellableFetch with csrf", async () => {
        const { defaultObjectsDelete } = listCrud;
        const target = { app: "blog", model: "post" };
        getListUrl.mockReturnValue("/list");
        const response = { status: 204 };
        cancellableFetch.mockImplementation((url, options, transform) => {
            expect(url).toBe("/list");
            expect(options).toMatchObject({
                method: "DELETE",
                credentials: "include",
                headers: { "X-CSRFToken": "csrf", "Content-Type": "application/json" },
                body: JSON.stringify({ pks: ["1", "2"] }),
            });
            return Promise.resolve(transform(response));
        });
        await defaultObjectsDelete({ target, pks: ["1", "2"] });
        expect(cancellableFetch).toHaveBeenCalled();
    });

    scopedIt("defaultObjectsDelete sets Dry-Run header when requested", async () => {
        const { defaultObjectsDelete } = listCrud;
        const target = { app: "blog", model: "post" };
        getListUrl.mockReturnValue("/list");
        const response = { status: 204 };
        cancellableFetch.mockImplementation((url, options, transform) => {
            expect(options.headers["Dry-Run"]).toBe("true");
            return Promise.resolve(transform(response));
        });
        await defaultObjectsDelete({ target, pks: ["1", "2"], dryRun: true });
        expect(cancellableFetch).toHaveBeenCalled();
    });

    scopedIt("defaultObjectsDelete sets Acknowledge-Warnings header when a digest is acknowledged", async () => {
        const { defaultObjectsDelete } = listCrud;
        const target = { app: "blog", model: "post" };
        getListUrl.mockReturnValue("/list");
        const response = { status: 204 };
        cancellableFetch.mockImplementation((url, options, transform) => {
            expect(options.headers["Acknowledge-Warnings"]).toBe("d1");
            return Promise.resolve(transform(response));
        });
        await defaultObjectsDelete({ target, pks: ["1", "2"], acknowledgeWarnings: "d1" });
        expect(cancellableFetch).toHaveBeenCalled();
    });

    scopedIt("defaultObjectsDelete omits Acknowledge-Warnings header when no digest is acknowledged", async () => {
        const { defaultObjectsDelete } = listCrud;
        const target = { app: "blog", model: "post" };
        getListUrl.mockReturnValue("/list");
        const response = { status: 204 };
        cancellableFetch.mockImplementation((url, options, transform) => {
            expect(options.headers["Acknowledge-Warnings"]).toBeUndefined();
            return Promise.resolve(transform(response));
        });
        await defaultObjectsDelete({ target, pks: ["1", "2"] });
        expect(cancellableFetch).toHaveBeenCalled();
    });

    scopedIt("defaultObjectsDelete throws ConfirmationRequiredError on 409", async () => {
        const { ConfirmationRequiredError } = await import("@vueda/utils/errors.js");
        const { defaultObjectsDelete } = listCrud;
        const target = { app: "blog", model: "post" };
        getListUrl.mockReturnValue("/list");
        const response = { status: 409 };
        const responseData = { confirmation_required: true, digest: "d1", warnings: { count: ["unusual"] } };
        getJsonOrText.mockResolvedValue(responseData);
        cancellableFetch.mockImplementation((url, options, transform) => transform(response));
        const error = await defaultObjectsDelete({ target, pks: ["1", "2"] }).catch((e) => e);
        expect(error).toBeInstanceOf(ConfirmationRequiredError);
        expect(error.digest).toBe("d1");
        expect(error.messages).toEqual({ count: ["unusual"] });
    });
});
