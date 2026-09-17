const cancellableFetch = vi.fn();
const getDetailUrl = vi.fn();
const getListUrl = vi.fn();
const getJsonOrText = vi.fn();
const getCSRFValue = vi.fn(() => "csrftoken");
const flattenPaths = vi.fn(() => []);
const setObjectCrud = vi.fn();

vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return {
        __esModule: true,
        ...actual,
        cancellableFetch,
        deepUnref: (v) => v,
        setObjectCrud,
        flattenPaths,
    };
});

vi.mock("@vueda/utils/urls.js", () => ({
    getDetailUrl,
    getListUrl,
}));

// Only `getJsonOrText` is stubbed: the retrieve/create/update/patch tests feed it hand-rolled response
// objects, while `actionRequestHeaders` and `readActionResponse` stay real so the delete and action
// handlers are tested against the classification they actually ship with.
vi.mock("@vueda/utils/fetchSupport.js", async () => {
    const actual = await vi.importActual("@vueda/utils/fetchSupport.js");
    return { ...actual, getJsonOrText };
});

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
    describe("defaultObjectRetrieve", () => {
        it("builds url with params and returns data", async () => {
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

        it("throws FetchError on non-200", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const response = new Response(JSON.stringify({ bad: true }), { status: 500 });
            getJsonOrText.mockResolvedValue({ bad: true });
            cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

            await expect(
                objectCrud.defaultObjectRetrieve({ target: { app: "a", model: "b" }, pk: "2" }),
            ).rejects.toBeInstanceOf(errors.FetchError);
        });
    });

    describe("defaultObjectCreate", () => {
        it("sends json and returns created object", async () => {
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

        it("uses FormData when object has a File", async () => {
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

        it("passes params to makeSearchParamsString", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const params = {
                [constants.FIELDS_PARAM]: ["id"],
                [constants.EXPAND_PARAM]: ["owner"],
            };
            const response = new Response(JSON.stringify({ id: 1 }), { status: 201 });
            getJsonOrText.mockResolvedValue({ id: 1 });
            global.fetch = vi.fn(() => Promise.resolve(response));

            const result = await objectCrud.defaultObjectCreate({
                target: { app: "blog", model: "article", pk: "2" },
                object: { title: "t" },
                params,
            });

            expect(getDetailUrl).toHaveBeenCalledWith({
                app: "blog",
                model: "article",
                pk: "2",
                action: undefined,
                query: "?f=id&e=owner",
            });
            expect(result).toEqual({ id: 1 });
        });

        it("throws FormValidationError on 400", async () => {
            getListUrl.mockReturnValue("list-url");
            const response = new Response(JSON.stringify({ field: "error" }), { status: 400 });
            getJsonOrText.mockResolvedValue({ field: "error" });
            global.fetch = vi.fn(() => Promise.resolve(response));

            await expect(
                objectCrud.defaultObjectCreate({ target: { app: "a", model: "b" }, object: {} }),
            ).rejects.toBeInstanceOf(errors.FormValidationError);
        });

        it("throws ConfirmationRequiredError on 409 with parsed digest and warnings", async () => {
            getListUrl.mockReturnValue("list-url");
            const body = { confirmation_required: true, digest: "abc123", warnings: { count: ["unusual"] } };
            const response = new Response(JSON.stringify(body), { status: 409 });
            getJsonOrText.mockResolvedValue(body);
            global.fetch = vi.fn(() => Promise.resolve(response));

            const error = await objectCrud
                .defaultObjectCreate({ target: { app: "a", model: "b" }, object: {} })
                .catch((e) => e);
            expect(error).toBeInstanceOf(errors.ConfirmationRequiredError);
            expect(error.digest).toBe("abc123");
            expect(error.messages).toEqual({ count: ["unusual"] });
            expect(error.errors).toEqual({});
            expect(error.bulk).toBe(false);
        });

        it("sends the Acknowledge-Warnings header when acknowledgeWarnings is set", async () => {
            getListUrl.mockReturnValue("list-url");
            const response = new Response(JSON.stringify({ id: 1 }), { status: 201 });
            getJsonOrText.mockResolvedValue({ id: 1 });
            global.fetch = vi.fn(() => Promise.resolve(response));

            await objectCrud.defaultObjectCreate({
                target: { app: "a", model: "b" },
                object: {},
                acknowledgeWarnings: "abc123",
            });
            expect(global.fetch).toHaveBeenCalledWith(
                "list-url",
                expect.objectContaining({ headers: expect.objectContaining({ "Acknowledge-Warnings": "abc123" }) }),
            );
        });

        it("throws FetchError on unexpected status", async () => {
            getListUrl.mockReturnValue("list-url");
            const response = new Response(JSON.stringify({}), { status: 500 });
            getJsonOrText.mockResolvedValue({});
            global.fetch = vi.fn(() => Promise.resolve(response));

            await expect(
                objectCrud.defaultObjectCreate({ target: { app: "a", model: "b" }, object: {} }),
            ).rejects.toBeInstanceOf(errors.FetchError);
        });

        it(".cancel aborts the request", async () => {
            const abortSpy = vi.fn();
            const controller = { signal: {}, abort: abortSpy };
            const OriginalAbortController = global.AbortController;
            global.AbortController = vi.fn(function () {
                return controller;
            });
            getListUrl.mockReturnValue("list-url");
            const response = new Response(JSON.stringify({ id: 3 }), { status: 201 });
            getJsonOrText.mockResolvedValue({ id: 3 });
            global.fetch = vi.fn(() => Promise.resolve(response));

            const promise = objectCrud.defaultObjectCreate({ target: { app: "a", model: "b" }, object: {} });
            promise.cancel();
            expect(abortSpy).toHaveBeenCalledTimes(1);
            await promise;
            global.AbortController = OriginalAbortController;
        });
    });

    describe("defaultObjectPatch", () => {
        it("sends json and returns patched object", async () => {
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

        it("uses FormData when partialObject has a File", async () => {
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

        it("throws FormValidationError on 400", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const response = new Response(JSON.stringify({}), { status: 400 });
            getJsonOrText.mockResolvedValue({});
            cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

            await expect(
                objectCrud.defaultObjectPatch({ target: { app: "a", model: "b" }, pk: "1", partialObject: {} }),
            ).rejects.toBeInstanceOf(errors.FormValidationError);
        });

        it("throws FetchError on non-200", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const response = new Response(JSON.stringify({}), { status: 500 });
            getJsonOrText.mockResolvedValue({});
            cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

            await expect(
                objectCrud.defaultObjectPatch({ target: { app: "a", model: "b" }, pk: "2", partialObject: {} }),
            ).rejects.toBeInstanceOf(errors.FetchError);
        });
    });

    describe("defaultObjectUpdate", () => {
        it("builds url with params and returns data", async () => {
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

        it("uses FormData when object has a File", async () => {
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

        it("uses the provided pkKey for non-id primary keys", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const object = { slug: "article-123", title: "hi" };
            const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
            getJsonOrText.mockResolvedValue({ ok: true });
            cancellableFetch.mockImplementation((url, opts, transform) => {
                expect(url).toBe("detail-url");
                expect(opts.method).toBe("PUT");
                return transform(response);
            });

            const result = await objectCrud.defaultObjectUpdate({
                target: { app: "blog", model: "article" },
                object,
                pkKey: "slug",
            });

            expect(result).toEqual({ ok: true });
            expect(getDetailUrl).toHaveBeenCalledWith({
                app: "blog",
                model: "article",
                pk: "article-123",
                action: undefined,
                query: "",
            });
        });

        it("throws FormValidationError on 400", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const object = { id: 5 };
            const response = new Response(JSON.stringify({ bad: true }), { status: 400 });
            getJsonOrText.mockResolvedValue({ bad: true });
            cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

            await expect(
                objectCrud.defaultObjectUpdate({ target: { app: "a", model: "b" }, object }),
            ).rejects.toBeInstanceOf(errors.FormValidationError);
        });

        it("throws ConfirmationRequiredError on 409 with parsed digest and warnings", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const object = { id: 5 };
            const body = { confirmation_required: true, digest: "def456", warnings: { count: ["unusual"] } };
            const response = new Response(JSON.stringify(body), { status: 409 });
            getJsonOrText.mockResolvedValue(body);
            cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

            const error = await objectCrud
                .defaultObjectUpdate({ target: { app: "a", model: "b" }, object })
                .catch((e) => e);
            expect(error).toBeInstanceOf(errors.ConfirmationRequiredError);
            expect(error.digest).toBe("def456");
            expect(error.messages).toEqual({ count: ["unusual"] });
            expect(error.bulk).toBe(false);
        });

        it("sends the Acknowledge-Warnings header when acknowledgeWarnings is set", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const object = { id: 5 };
            const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
            getJsonOrText.mockResolvedValue({ ok: true });
            cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

            await objectCrud.defaultObjectUpdate({
                target: { app: "a", model: "b" },
                object,
                acknowledgeWarnings: "def456",
            });
            expect(cancellableFetch).toHaveBeenCalledWith(
                "detail-url",
                expect.objectContaining({ headers: expect.objectContaining({ "Acknowledge-Warnings": "def456" }) }),
                expect.any(Function),
            );
        });

        it("throws FetchError on failure", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const object = { id: 6 };
            const response = new Response(JSON.stringify({}), { status: 500 });
            getJsonOrText.mockResolvedValue({});
            cancellableFetch.mockImplementation((url, opts, transform) => transform(response));

            await expect(
                objectCrud.defaultObjectUpdate({ target: { app: "a", model: "b" }, object }),
            ).rejects.toBeInstanceOf(errors.FetchError);
        });
    });

    describe("defaultObjectDelete", () => {
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

        it("resolves and builds url with deleteArgs", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const captured = captureDelete(new Response(null, { status: 204 }));

            const result = await objectCrud.defaultObjectDelete({
                target: { app: "blog", model: "article" },
                pk: "3",
                deleteArgs: {
                    [constants.FIELDS_PARAM]: ["id", undefined],
                    foo: "bar",
                },
            });

            expect(captured[0].url).toBe("detail-url");
            expect(captured[0].options).toMatchObject({
                method: "DELETE",
                credentials: "include",
                headers: { "X-CSRFToken": "csrftoken", "Content-Type": "application/json" },
            });
            expect(getDetailUrl).toHaveBeenCalledWith({
                app: "blog",
                model: "article",
                pk: "3",
                action: undefined,
                query: "?f=id&foo=bar",
            });
            expect(result).toBeUndefined();
        });

        it("resolves without deleteArgs", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            captureDelete(new Response(null, { status: 204 }));

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

        it("sends extra form fields as the body", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const captured = captureDelete(new Response(null, { status: 204 }));

            await objectCrud.defaultObjectDelete({
                target: { app: "blog", model: "article" },
                pk: "4",
                formData: { reason: "spam" },
            });

            expect(JSON.parse(captured[0].options.body)).toEqual({ reason: "spam" });
        });

        it("accepts the server's dry-run 200 and sets the header", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const captured = captureDelete(new Response(JSON.stringify({ warnings: {} }), { status: 200 }));

            const result = await objectCrud.defaultObjectDelete({
                target: { app: "blog", model: "article" },
                pk: "4",
                dryRun: true,
            });

            expect(captured[0].options.headers["Dry-Run"]).toBe("true");
            expect(result).toEqual({ warnings: {} });
        });

        it("treats a 200 on a real delete as a failure", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            captureDelete(new Response(JSON.stringify({}), { status: 200 }));

            // Only a 204 confirms a delete happened; a 200 outside a dry run is the server answering
            // something else, and must not read as success just because the status is in the 2xx range.
            await expect(
                objectCrud.defaultObjectDelete({ target: { app: "blog", model: "article" }, pk: "9" }),
            ).rejects.toBeInstanceOf(errors.FetchError);
        });

        it("throws FetchError on failure", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            captureDelete(new Response(JSON.stringify({}), { status: 500 }));

            await expect(
                objectCrud.defaultObjectDelete({ target: { app: "blog", model: "article" }, pk: "9" }),
            ).rejects.toBeInstanceOf(errors.FetchError);
        });

        it("throws ConfirmationRequiredError on 409", async () => {
            getDetailUrl.mockReturnValue("detail-url");
            const responseData = { confirmation_required: true, digest: "d1", warnings: { count: ["unusual"] } };
            captureDelete(new Response(JSON.stringify(responseData), { status: 409 }));

            const error = await objectCrud
                .defaultObjectDelete({
                    target: { app: "blog", model: "article" },
                    pk: "9",
                    acknowledgeWarnings: undefined,
                })
                .catch((e) => e);

            expect(error).toBeInstanceOf(errors.ConfirmationRequiredError);
            expect(error.digest).toBe("d1");
            expect(error.bulk).toBe(false);
        });
    });

    describe("defaultObjectExecuteAction", () => {
        it("sends the action to the detail action url", async () => {
            getDetailUrl.mockReturnValue("detail-action-url");
            let captured;
            cancellableFetch.mockImplementation((url, options, transform) => {
                captured = { url, options };
                return Promise.resolve(transform(new Response(JSON.stringify({ archived: true }), { status: 200 })));
            });

            const result = await objectCrud.defaultObjectExecuteAction({
                target: { app: "blog", model: "article" },
                pk: "3",
                action: "archive",
                requestMethod: "POST",
                formData: { reason: "stale" },
                dryRun: true,
                acknowledgeWarnings: "d1",
            });

            expect(getDetailUrl).toHaveBeenCalledWith({
                app: "blog",
                model: "article",
                pk: "3",
                action: "archive",
            });
            expect(captured.url).toBe("detail-action-url");
            expect(captured.options).toMatchObject({ method: "POST", credentials: "include" });
            expect(captured.options.headers).toMatchObject({ "Dry-Run": "true", "Acknowledge-Warnings": "d1" });
            expect(JSON.parse(captured.options.body)).toEqual({ reason: "stale" });
            expect(result).toEqual({ archived: true });
        });

        it("defaults to PUT and sends no body without form data", async () => {
            getDetailUrl.mockReturnValue("detail-action-url");
            let captured;
            cancellableFetch.mockImplementation((url, options, transform) => {
                captured = { url, options };
                return Promise.resolve(transform(new Response(null, { status: 204 })));
            });

            await objectCrud.defaultObjectExecuteAction({
                target: { app: "blog", model: "article" },
                pk: "3",
                action: "archive",
            });

            expect(captured.options.method).toBe("PUT");
            expect(captured.options.body).toBeUndefined();
        });

        it("throws FormValidationError on 400", async () => {
            getDetailUrl.mockReturnValue("detail-action-url");
            cancellableFetch.mockImplementation((url, options, transform) =>
                transform(new Response(JSON.stringify({ name: ["Required."] }), { status: 400 })),
            );

            await expect(
                objectCrud.defaultObjectExecuteAction({
                    target: { app: "blog", model: "article" },
                    pk: "3",
                    action: "archive",
                }),
            ).rejects.toBeInstanceOf(errors.FormValidationError);
        });

        it("throws ConfirmationRequiredError with bulk:false on 409", async () => {
            getDetailUrl.mockReturnValue("detail-action-url");
            const responseData = { confirmation_required: true, digest: "d1", warnings: { count: ["unusual"] } };
            cancellableFetch.mockImplementation((url, options, transform) =>
                transform(new Response(JSON.stringify(responseData), { status: 409 })),
            );

            const error = await objectCrud
                .defaultObjectExecuteAction({
                    target: { app: "blog", model: "article" },
                    pk: "3",
                    action: "archive",
                })
                .catch((e) => e);

            expect(error).toBeInstanceOf(errors.ConfirmationRequiredError);
            expect(error.bulk).toBe(false);
        });
    });

    describe("setupDefaultObjectCrud", () => {
        it("registers crud functions", () => {
            const {
                defaultObjectRetrieve,
                defaultObjectCreate,
                defaultObjectUpdate,
                defaultObjectPatch,
                defaultObjectDelete,
                defaultObjectExecuteAction,
                setupDefaultObjectCrud,
            } = objectCrud;

            setupDefaultObjectCrud();

            expect(setObjectCrud).toHaveBeenCalledWith({
                retrieve: defaultObjectRetrieve,
                create: defaultObjectCreate,
                update: defaultObjectUpdate,
                patch: defaultObjectPatch,
                delete: defaultObjectDelete,
                executeAction: defaultObjectExecuteAction,
            });
        });
    });
});
