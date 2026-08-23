/**
 * @module .vitepress/theme/fixtures/demoApi
 *
 * Offline API seam for the live view demos.
 *
 * `AuthDemo` reaches its seam one level up, by replacing the `storeUser` actions a
 * view calls. The CRUDL, action, and workflow views cannot use that seam: their data
 * arrives through `useList` / `useObject` (reactive-helpers), whose crud handlers are
 * wired inside `useViewList` / `useDetailView` and are not injectable from outside.
 *
 * Every one of those paths bottoms out in a global `fetch` against a `/routes/...`
 * URL built by `client/lib/utils/urls.js`, so that is where this module intercepts.
 * Mocking `fetch` keeps the real crud adaptors in play: pagination parsing, the
 * `resultsKey` unwrap, `FormValidationError` / `ConfirmationRequiredError` mapping,
 * and request cancellation are all exercised by the demo exactly as in an app.
 *
 * `fetch` is global, so the registry is a single flat, ordered list rather than one
 * mock per demo. Routes are matched against the full URL pathname in registration
 * (mount) order, first match wins. Every route pattern must therefore be scoped tightly
 * enough to identify its own demo: patterns built by the fixture helpers include the
 * app label and model, and two demos that need different responses for the same model
 * must be registered under different app labels (see `showcaseRecords.js`).
 *
 * Any `/routes/` request that matches nothing answers 501 and logs the URL, so a
 * missing mock surfaces as a visible error in the demo rather than a hung request.
 */

/** Path prefix every vueda API URL carries (see `client/lib/utils/urls.js`). */
const API_PREFIX = "/routes/";

/**
 * One mocked endpoint.
 *
 * @typedef {object} DemoRoute
 * @property {string} [method="GET"] - HTTP method to match, case-insensitive.
 * @property {RegExp} path - Matched against the URL pathname. Named capture groups
 *   land in `context.params`.
 * @property {(context: DemoRequestContext) => any} handler - Returns the response body
 *   (serialized as JSON with status 200), or a `DemoResponse` for anything else.
 * @property {number} [latency] - Overrides the registration's latency for this route.
 */

/**
 * @typedef {object} DemoRequestContext
 * @property {string} url - The full request URL.
 * @property {string} method - The uppercased HTTP method.
 * @property {{[name: string]: string}} params - Named capture groups from `path`.
 * @property {URLSearchParams} query - The request query string.
 * @property {Headers} headers - The request headers, so a handler can branch on the ones
 *   vueda sends (`Dry-Run`, `Acknowledge-Warnings`).
 * @property {any} body - The parsed JSON request body, or undefined.
 */

/**
 * An explicit response, for handlers that need a status other than 200.
 *
 * @typedef {object} DemoResponse
 * @property {number} status
 * @property {any} [body] - Serialized as JSON unless it is a string.
 */

/** @type {{ id: number, routes: DemoRoute[], latency: number }[]} */
const registrations = [];

let installed = false;
let nativeFetch = null;
let nextId = 0;

/**
 * Mark a handler result as an explicit response rather than a 200 body.
 *
 * @param {number} status - HTTP status code.
 * @param {any} [body] - Response body; serialized as JSON unless it is a string.
 * @returns {DemoResponse}
 */
export function demoResponse(status, body) {
    return { __demoResponse: true, status, body };
}

/**
 * Register a demo's mocked endpoints and install the interceptor if it is not up yet.
 *
 * @param {DemoRoute[]} routes - Endpoints, tried in order within this registration.
 * @param {object} [options]
 * @param {number} [options.latency=0] - Milliseconds to stall every response, so the
 *   view's loading states are visible.
 * @returns {() => void} Unregisters these routes. Call it on unmount.
 */
export function registerDemoRoutes(routes, { latency = 0 } = {}) {
    installDemoApi();
    const id = ++nextId;
    registrations.push({ id, routes, latency });
    return () => {
        const index = registrations.findIndex((entry) => entry.id === id);
        if (index !== -1) {
            registrations.splice(index, 1);
        }
    };
}

/**
 * Patch `globalThis.fetch` so `/routes/` requests resolve from the registry. Idempotent,
 * and a no-op during SSR (the docs build prerenders without any demo mounted).
 *
 * @returns {void}
 */
export function installDemoApi() {
    if (installed || typeof globalThis === "undefined" || typeof globalThis.fetch !== "function") {
        return;
    }
    installed = true;
    nativeFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = demoFetch;
}

/**
 * Resolve a `/routes/` request from the registry; anything else goes to the real
 * `fetch` (VitePress fetches its own page data through it).
 *
 * @param {RequestInfo} input
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
async function demoFetch(input, init = {}) {
    const url = typeof input === "string" ? input : input?.url;
    let parsed;
    try {
        parsed = new URL(url, globalThis.location?.href);
    } catch {
        return nativeFetch(input, init);
    }
    if (!parsed.pathname.startsWith(API_PREFIX)) {
        return nativeFetch(input, init);
    }

    const method = (init.method || "GET").toUpperCase();
    const match = findRoute(parsed.pathname, method);
    if (!match) {
        console.warn(`[demoApi] no demo route for ${method} ${parsed.pathname}${parsed.search}`);
        return jsonResponse(501, { detail: `No demo route registered for ${method} ${parsed.pathname}` });
    }

    const { route, registration, params } = match;
    const latency = route.latency ?? registration.latency;
    if (latency) {
        await stall(latency, init.signal);
    }
    throwIfAborted(init.signal);

    let body;
    if (typeof init.body === "string") {
        try {
            body = JSON.parse(init.body);
        } catch {
            body = init.body;
        }
    }

    let result;
    try {
        result = await route.handler({
            url,
            method,
            params,
            query: parsed.searchParams,
            headers: new Headers(init.headers ?? {}),
            body,
        });
    } catch (error) {
        // A handler that throws a DemoResponse is choosing a status; anything else is a
        // fixture bug and should read as a server fault rather than a silent success.
        if (error?.__demoResponse) {
            return jsonResponse(error.status, error.body);
        }
        console.error(`[demoApi] handler failed for ${method} ${parsed.pathname}`, error);
        return jsonResponse(500, { detail: String(error?.message ?? error) });
    }
    throwIfAborted(init.signal);

    if (result?.__demoResponse) {
        return jsonResponse(result.status, result.body);
    }
    return jsonResponse(200, result);
}

/**
 * Find the first registered route matching a pathname and method.
 *
 * @param {string} pathname
 * @param {string} method
 * @returns {{route: DemoRoute, registration: object, params: object}|null}
 */
function findRoute(pathname, method) {
    for (const registration of registrations) {
        for (const route of registration.routes) {
            if ((route.method || "GET").toUpperCase() !== method) {
                continue;
            }
            const matched = route.path.exec(pathname);
            if (matched) {
                return { route, registration, params: matched.groups ?? {} };
            }
        }
    }
    return null;
}

/**
 * Build a `Response` the real crud adaptors can consume. A 204 carries no body, matching
 * the delete paths that branch on it.
 *
 * @param {number} status
 * @param {any} body
 * @returns {Response}
 */
function jsonResponse(status, body) {
    if (status === 204 || body === undefined) {
        return new Response(null, { status });
    }
    const payload = typeof body === "string" ? body : JSON.stringify(body);
    return new Response(payload, {
        status,
        headers: { "content-type": "application/json" },
    });
}

/**
 * Sleep, rejecting early if the request is aborted so cancelled list pages behave as
 * they do against a real server.
 *
 * @param {number} ms
 * @param {AbortSignal} [signal]
 * @returns {Promise<void>}
 */
function stall(ms, signal) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        function onAbort() {
            clearTimeout(timer);
            reject(abortError(signal));
        }
        if (signal?.aborted) {
            onAbort();
            return;
        }
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

/**
 * @param {AbortSignal} [signal]
 * @returns {void}
 * @throws {DOMException} When the signal is already aborted.
 */
function throwIfAborted(signal) {
    if (signal?.aborted) {
        throw abortError(signal);
    }
}

/**
 * @param {AbortSignal} [signal]
 * @returns {any} The abort reason, matching what a real `fetch` rejects with.
 */
function abortError(signal) {
    return signal?.reason ?? new DOMException("The operation was aborted.", "AbortError");
}
