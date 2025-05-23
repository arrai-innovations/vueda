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
        const pageCallback = vi.fn();
        await singlePagePaginatedListCrudAdaptor({ target, params, pageCallback });
        expect(pageCallback).toHaveBeenCalledWith([1], { totalRecords: 1, totalPages: 1, perPage: 10, page: 2 });
    });

    scopedIt("allPagePaginatedListCrudAdaptor fetches multiple pages", async () => {
        const { allPagePaginatedListCrudAdaptor } = listCrud;
        const target = { app: "blog", model: "post", resultsKey: "items" };
        getListUrl.mockReturnValue("/list");
        const response1 = { status: 200 };
        const response2 = { status: 200 };
        global.fetch = vi.fn().mockResolvedValueOnce(response1).mockResolvedValueOnce(response2);
        getJsonOrText
            .mockResolvedValueOnce({ items: ["a"], totalRecords: 2, totalPages: 2, perPage: 1 })
            .mockResolvedValueOnce({ items: ["b"], totalRecords: 2, totalPages: 2, perPage: 1 });
        const pageCallback = vi.fn();
        await allPagePaginatedListCrudAdaptor({ target, params: {}, pageCallback });
        await Promise.resolve();
        await Promise.resolve();
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(pageCallback).toHaveBeenNthCalledWith(1, ["a"], { totalRecords: 2, totalPages: 2, perPage: 1, page: 1 });
        expect(pageCallback).toHaveBeenNthCalledWith(2, ["b"], { totalRecords: 2, totalPages: 2, perPage: 1, page: 2 });
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
});
