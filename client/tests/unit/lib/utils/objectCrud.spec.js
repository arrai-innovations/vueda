const cancellableFetch = vi.fn();
const getDetailUrl = vi.fn();
const getListUrl = vi.fn();
const getJsonOrText = vi.fn();
const getCSRFValue = vi.fn(() => "csrftoken");
const flattenPaths = vi.fn(() => []);

vi.mock("@arrai-innovations/reactive-helpers", () => ({
    cancellableFetch,
    deepUnref: (v) => v,
    setObjectCrud: vi.fn(),
    flattenPaths,
}));

vi.mock("@vueda/utils/urls.js", () => ({
    getDetailUrl,
    getListUrl,
}));

vi.mock("@vueda/utils/fetchSupport.js", () => ({
    getJsonOrText,
}));

vi.mock("@vueda/utils/csrf.js", () => ({
    getCSRFValue,
}));

let objectCrud;
let constants;
let errors;

beforeEach(async () => {
    objectCrud = await import("@vueda/utils/objectCrud.js");
    constants = await import("@vueda/utils/constants.js");
    errors = await import("@vueda/utils/errors.js");
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/utils/objectCrud.js", () => {
    it("defaultObjectRetrieve builds url with params and returns data", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const params = {
            [constants.FIELDS_PARAM]: ["id", undefined],
            [constants.EXPAND_PARAM]: ["owner"],
        };
        const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
        getJsonOrText.mockResolvedValue({ ok: true });
        cancellableFetch.mockImplementation((url, opts, transform) => {
            expect(url).toBe("detail-url");
            expect(opts.method).toBe("GET");
            expect(opts.credentials).toBe("include");
            expect(opts.signal).toBeInstanceOf(AbortSignal);
            return transform(response);
        });

        const result = await objectCrud.defaultObjectRetrieve({
            target: { app: "blog", model: "article" },
            pk: "1",
            params,
        });

        expect(result).toEqual({ ok: true });
        expect(getDetailUrl).toHaveBeenCalledWith({
            app: "blog",
            model: "article",
            pk: "1",
            action: undefined,
            query: "?f=id&e=owner",
        });
    });

    it("defaultObjectRetrieve throws FetchError on non-200", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const response = new Response(JSON.stringify({ bad: true }), { status: 500 });
        getJsonOrText.mockResolvedValue({ bad: true });
        cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

        await expect(
            objectCrud.defaultObjectRetrieve({ target: { app: "a", model: "b" }, pk: "2" }),
        ).rejects.toBeInstanceOf(errors.FetchError);
    });

    it("defaultObjectCreate sends json and returns created object", async () => {
        getListUrl.mockReturnValue("list-url");
        const response = new Response(JSON.stringify({ id: 5 }), { status: 201 });
        getJsonOrText.mockResolvedValue({ id: 5 });
        global.fetch = vi.fn(() => Promise.resolve(response));

        const result = await objectCrud.defaultObjectCreate({
            target: { app: "blog", model: "article" },
            object: { title: "hi" },
        });

        expect(fetch).toHaveBeenCalledWith(
            "list-url",
            expect.objectContaining({
                method: "POST",
                credentials: "include",
                headers: { "X-CSRFToken": "csrftoken", "Content-Type": "application/json" },
                body: JSON.stringify({ title: "hi" }),
                signal: expect.any(AbortSignal),
            }),
        );
        expect(result).toEqual({ id: 5 });
    });

    it("defaultObjectCreate uses FormData when object has a File", async () => {
        getListUrl.mockReturnValue("list-url");
        const response = new Response(JSON.stringify({ id: 6 }), { status: 201 });
        getJsonOrText.mockResolvedValue({ id: 6 });
        global.fetch = vi.fn(() => Promise.resolve(response));

        const file = new File(["data"], "file.txt");
        const result = await objectCrud.defaultObjectCreate({
            target: { app: "blog", model: "article" },
            object: { file },
        });

        const options = fetch.mock.calls[0][1];
        expect(options.headers).toEqual({ "X-CSRFToken": "csrftoken" });
        expect(options.body).toBeInstanceOf(FormData);
        expect(result).toEqual({ id: 6 });
    });

    it("defaultObjectPatch sends json and returns patched object", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const params = {
            [constants.FIELDS_PARAM]: ["id"],
            [constants.EXPAND_PARAM]: ["owner"],
        };
        const response = new Response(JSON.stringify({ id: 7 }), { status: 200 });
        getJsonOrText.mockResolvedValue({ id: 7 });
        cancellableFetch.mockImplementation((url, opts, transform) => {
            expect(url).toBe("detail-url");
            expect(opts.method).toBe("PATCH");
            expect(opts.credentials).toBe("include");
            expect(opts.headers).toEqual({
                "X-CSRFToken": "csrftoken",
                "Content-Type": "application/json",
            });
            expect(opts.body).toBe(JSON.stringify({ title: "hi" }));
            expect(opts.signal).toBeInstanceOf(AbortSignal);
            return transform(response);
        });

        const result = await objectCrud.defaultObjectPatch({
            target: { app: "blog", model: "article" },
            pk: "7",
            partialObject: { title: "hi" },
            params,
        });

        expect(result).toEqual({ id: 7 });
        expect(getDetailUrl).toHaveBeenCalledWith({
            app: "blog",
            model: "article",
            pk: "7",
            action: undefined,
            query: "?f=id&e=owner",
        });
    });

    it("defaultObjectPatch uses FormData when partialObject has a File", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const file = new File(["data"], "file.txt");
        const response = new Response(JSON.stringify({ id: 8 }), { status: 200 });
        getJsonOrText.mockResolvedValue({ id: 8 });
        cancellableFetch.mockImplementation((url, opts, transform) => {
            expect(opts.headers).toEqual({ "X-CSRFToken": "csrftoken" });
            expect(opts.body).toBeInstanceOf(FormData);
            return transform(response);
        });

        const result = await objectCrud.defaultObjectPatch({
            target: { app: "blog", model: "article" },
            pk: "8",
            partialObject: { file },
        });

        expect(result).toEqual({ id: 8 });
    });

    it("defaultObjectPatch throws FormValidationError on 400", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const response = new Response(JSON.stringify({}), { status: 400 });
        getJsonOrText.mockResolvedValue({});
        cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

        await expect(
            objectCrud.defaultObjectPatch({ target: { app: "a", model: "b" }, pk: "1", partialObject: {} }),
        ).rejects.toBeInstanceOf(errors.FormValidationError);
    });

    it("defaultObjectPatch throws FetchError on non-200", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const response = new Response(JSON.stringify({}), { status: 500 });
        getJsonOrText.mockResolvedValue({});
        cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

        await expect(
            objectCrud.defaultObjectPatch({ target: { app: "a", model: "b" }, pk: "2", partialObject: {} }),
        ).rejects.toBeInstanceOf(errors.FetchError);
    });

    it("defaultObjectDelete throws FetchError on failure", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const response = new Response(JSON.stringify({}), { status: 500 });
        global.fetch = vi.fn(() => Promise.resolve(response));
        getJsonOrText.mockResolvedValue({});

        await expect(
            objectCrud.defaultObjectDelete({ target: { app: "blog", model: "article" }, pk: "9" }),
        ).rejects.toBeInstanceOf(errors.FetchError);
    });

    it("defaultObjectUpdate builds url with params and returns data", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const params = {
            [constants.FIELDS_PARAM]: ["id"],
            [constants.EXPAND_PARAM]: ["owner"],
        };
        const object = { id: 2, title: "hi" };
        const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
        getJsonOrText.mockResolvedValue({ ok: true });
        cancellableFetch.mockImplementation((url, opts, transform) => {
            expect(url).toBe("detail-url");
            expect(opts.method).toBe("PUT");
            expect(opts.credentials).toBe("include");
            expect(opts.headers).toEqual({ "X-CSRFToken": "csrftoken", "Content-Type": "application/json" });
            expect(opts.body).toBe(JSON.stringify(object));
            expect(opts.signal).toBeInstanceOf(AbortSignal);
            return transform(response);
        });

        const result = await objectCrud.defaultObjectUpdate({
            target: { app: "blog", model: "article" },
            object,
            params,
        });

        expect(result).toEqual({ ok: true });
        expect(getDetailUrl).toHaveBeenCalledWith({
            app: "blog",
            model: "article",
            pk: 2,
            action: undefined,
            query: "?f=id&e=owner",
        });
    });

    it("defaultObjectUpdate uses FormData when object has a File", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const file = new File(["data"], "file.txt");
        const object = { id: 3, file };
        const response = new Response(JSON.stringify({ id: 3 }), { status: 200 });
        getJsonOrText.mockResolvedValue({ id: 3 });
        cancellableFetch.mockImplementation((url, opts, transform) => {
            expect(opts.headers).toEqual({ "X-CSRFToken": "csrftoken" });
            expect(opts.body).toBeInstanceOf(FormData);
            return transform(response);
        });

        const result = await objectCrud.defaultObjectUpdate({
            target: { app: "blog", model: "article" },
            object,
        });

        expect(result).toEqual({ id: 3 });
    });

    it("defaultObjectUpdate throws FormValidationError on 400", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const object = { id: 5 };
        const response = new Response(JSON.stringify({ bad: true }), { status: 400 });
        getJsonOrText.mockResolvedValue({ bad: true });
        cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

        await expect(
            objectCrud.defaultObjectUpdate({ target: { app: "a", model: "b" }, object }),
        ).rejects.toBeInstanceOf(errors.FormValidationError);
    });

    it("defaultObjectUpdate throws FetchError on failure", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const object = { id: 6 };
        const response = new Response(JSON.stringify({}), { status: 500 });
        getJsonOrText.mockResolvedValue({});
        cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

        await expect(
            objectCrud.defaultObjectUpdate({ target: { app: "a", model: "b" }, object }),
        ).rejects.toBeInstanceOf(errors.FetchError);
    });

    it("defaultObjectDelete resolves and builds url with deleteArgs", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const response = new Response(null, { status: 204 });
        global.fetch = vi.fn(() => Promise.resolve(response));

        const result = await objectCrud.defaultObjectDelete({
            target: { app: "blog", model: "article" },
            pk: "3",
            deleteArgs: {
                [constants.FIELDS_PARAM]: ["id", undefined],
                foo: "bar",
            },
        });

        expect(fetch).toHaveBeenCalledWith(
            "detail-url",
            expect.objectContaining({
                method: "DELETE",
                credentials: "include",
                headers: { "X-CSRFToken": "csrftoken" },
                signal: expect.any(AbortSignal),
            }),
        );
        expect(getDetailUrl).toHaveBeenCalledWith({
            app: "blog",
            model: "article",
            pk: "3",
            action: undefined,
            query: "?f=id&foo=bar",
        });
        expect(result).toBeUndefined();
    });

    it("defaultObjectDelete resolves without deleteArgs", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const response = new Response(null, { status: 204 });
        global.fetch = vi.fn(() => Promise.resolve(response));

        const result = await objectCrud.defaultObjectDelete({
            target: { app: "blog", model: "article" },
            pk: "4",
        });

        expect(getDetailUrl).toHaveBeenCalledWith({
            app: "blog",
            model: "article",
            pk: "4",
            action: undefined,
            query: "",
        });
        expect(result).toBeUndefined();
    });

    it("defaultObjectDelete.cancel aborts the request", async () => {
        const originalAbort = global.AbortController;
        const abortSpy = vi.fn();
        const controller = { signal: {}, abort: abortSpy };
        global.AbortController = vi.fn(() => controller);

        getDetailUrl.mockReturnValue("detail-url");
        const response = new Response(null, { status: 204 });
        global.fetch = vi.fn(() => Promise.resolve(response));

        const promise = objectCrud.defaultObjectDelete({
            target: { app: "blog", model: "article" },
            pk: "5",
        });

        promise.cancel();
        expect(abortSpy).toHaveBeenCalledTimes(1);
        await promise;
        global.AbortController = originalAbort;
    });
});
