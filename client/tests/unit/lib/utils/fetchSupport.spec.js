import { scopedIt } from "@tests/unit/utils.js";
import { FetchError } from "@vueda/utils/errors.js";
import { fetchHelper, getJsonOrText } from "@vueda/utils/fetchSupport.js";

describe("lib/utils/fetchSupport.js", () => {
    const originalFetch = global.fetch;
    const OriginalAbortController = global.AbortController;

    afterEach(() => {
        global.fetch = originalFetch;
        global.AbortController = OriginalAbortController;
        vi.restoreAllMocks();
        vi.resetModules();
    });

    scopedIt("getJsonOrText parses JSON bodies", async () => {
        const response = new Response(JSON.stringify({ a: 1 }), { status: 200 });
        const data = await getJsonOrText(response);
        expect(data).toEqual({ a: 1 });
    });

    scopedIt("getJsonOrText returns text for non JSON", async () => {
        const response = new Response("plain", { status: 200 });
        const data = await getJsonOrText(response);
        expect(data).toBe("plain");
    });

    scopedIt("getJsonOrText rethrows non SyntaxError", async () => {
        const response = new Response("{}", { status: 200 });
        const original = JSON.parse;
        JSON.parse = () => {
            const err = new Error("boom");
            err.name = "Custom";
            throw err;
        };
        await expect(getJsonOrText(response)).rejects.toThrow("boom");
        JSON.parse = original;
    });
    scopedIt("fetchHelper accepts errorClass as a callable", async () => {
        const customErrorFn = vi.fn((prefix) => {
            return new Error(`custom error: ${prefix}`);
        });

        const res = new Response(null, { status: 400 }); // simulate error response
        global.fetch = vi.fn().mockResolvedValue(res);

        await expect(fetchHelper("/api", {}, "fetch", customErrorFn)).rejects.toThrow("custom error: fetch");

        expect(customErrorFn).toHaveBeenCalledWith("fetch", res, expect.anything());
    });
    scopedIt("fetchHelper accepts errorClass as a class constructor", async () => {
        class MyCustomError extends Error {
            constructor(prefix) {
                super(`MyCustomError: ${prefix}`);
            }
        }

        const res = new Response(null, { status: 500 });
        global.fetch = vi.fn().mockResolvedValue(res);

        await expect(fetchHelper("/api", {}, "fetch", MyCustomError)).rejects.toThrow(MyCustomError);
    });
    scopedIt("fetchHelper resolves with parsed data on success", async () => {
        const res = new Response(JSON.stringify({ ok: true }), { status: 200 });
        global.fetch = vi.fn().mockResolvedValue(res);
        const result = await fetchHelper("/api", {}, "fetch");
        expect(result).toEqual({ ok: true });
        expect(global.fetch).toHaveBeenCalledWith(
            "/api",
            expect.objectContaining({ credentials: "include", signal: expect.any(Object) }),
        );
    });

    scopedIt("fetchHelper resolves undefined for 204 responses", async () => {
        const res = new Response(null, { status: 204 });
        global.fetch = vi.fn().mockResolvedValue(res);

        const result = await fetchHelper("/api", {}, "fetch");

        expect(result).toBeUndefined();
    });

    scopedIt("fetchHelper rejects with FetchError on failure", async () => {
        const res = new Response(JSON.stringify({ error: true }), { status: 500, statusText: "Error" });
        global.fetch = vi.fn().mockResolvedValue(res);
        const promise = fetchHelper("/fail", {}, "prefix");
        await expect(promise).rejects.toHaveProperty("name", "FetchError");
    });

    scopedIt("fetchHelper resolves emptyResponseValue for empty status codes", async () => {
        const res = new Response(null, { status: 404 });
        global.fetch = vi.fn().mockResolvedValue(res);
        const data = await fetchHelper("/empty", {}, "prefix", FetchError, new Set([404]), "EMPTY");
        expect(data).toBe("EMPTY");
    });

    scopedIt("fetchHelper.cancel aborts the request", async () => {
        const abortSpy = vi.fn();
        const controller = { signal: {}, abort: abortSpy };
        const AbortControllerMock = vi.fn(() => controller);
        global.AbortController = AbortControllerMock;
        global.fetch = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
        const promise = fetchHelper("/abort", {}, "prefix");
        promise.cancel();
        expect(abortSpy).toHaveBeenCalledTimes(1);
        await promise;
    });
});
