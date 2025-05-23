const cancellableFetch = vi.fn();
const getDetailUrl = vi.fn();
const getListUrl = vi.fn();
const getJsonOrText = vi.fn();
const getCSRFValue = vi.fn(() => "csrftoken");

vi.mock("@arrai-innovations/reactive-helpers", () => ({
    cancellableFetch,
    deepUnref: (v) => v,
    setObjectCrud: vi.fn(),
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

    it("defaultObjectDelete throws FetchError on failure", async () => {
        getDetailUrl.mockReturnValue("detail-url");
        const response = new Response(JSON.stringify({}), { status: 500 });
        global.fetch = vi.fn(() => Promise.resolve(response));
        getJsonOrText.mockResolvedValue({});

        await expect(
            objectCrud.defaultObjectDelete({ target: { app: "blog", model: "article" }, pk: "9" }),
        ).rejects.toBeInstanceOf(errors.FetchError);
    });
});
