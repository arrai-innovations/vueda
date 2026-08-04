/**
 * @module tests/unit/themeStub
 * @description Shared `vi.mock` helpers for `@vueda/use/useTheme.js`.
 *
 * The real `useTheme(componentName, props, context, keyFn)` returns a callable
 * (the slot resolver) that also carries four auxiliary properties:
 * `componentName`, `es`, `loading`, and `hideStyle`. SFCs read these via
 * optional chaining today (e.g. `theme.hideStyle?.value`), but optional chaining
 * is defensive plaster. Centralizing the stub shape here means adding future
 * properties only requires updating one helper.
 *
 * Two factories are exported:
 *
 * - {@link makeThemeFn} returns a callable spy with the four properties
 *   attached. Use this when a spec only needs one theme function in isolation
 *   and does not need to assert on `useTheme()` invocations.
 * - {@link makeUseThemeMock} returns a `vi.fn()` that, when called as
 *   `useTheme(...)`, returns a callable shaped like the real return value.
 *   Use this when the spec asserts on `useTheme` itself (call count,
 *   arguments) or needs the same theme function returned across many calls.
 *
 * Hoisting note: `vi.mock(...)` factories are hoisted above imports. The
 * helpers in this module are pure (no Vue runtime imports), so they can be
 * referenced from inside a `vi.mock` factory provided the helper symbol is
 * declared at module top-level (typical pattern). When the symbol must be
 * shared with the factory and the test body, prefer the `vi.hoisted(...)`
 * pattern shown below.
 *
 * @example
 * // Simplest case: mock returns a fresh theme function on each call.
 * import { makeUseThemeMock } from "@tests/unit/themeStub.js";
 *
 * const mockedUseTheme = makeUseThemeMock();
 * vi.mock("@vueda/use/useTheme.js", () => ({
 *     useTheme: mockedUseTheme,
 *     THEME_OVERRIDE_PROPS: {},
 * }));
 *
 * @example
 * // Stable theme function so the spec can spy on slot lookups.
 * import { makeThemeFn, makeUseThemeMock } from "@tests/unit/themeStub.js";
 *
 * const themeFn = makeThemeFn({ slotResolver: (k) => `theme-${k}` });
 * const mockedUseTheme = makeUseThemeMock({ themeFn });
 * vi.mock("@vueda/use/useTheme.js", () => ({
 *     useTheme: mockedUseTheme,
 *     THEME_OVERRIDE_PROPS: {},
 * }));
 *
 * @example
 * // Capture the `context` arg passed to `useTheme`.
 * import { makeUseThemeMock } from "@tests/unit/themeStub.js";
 *
 * let capturedContext;
 * const mockedUseTheme = makeUseThemeMock({
 *     onCall: (componentName, props, context) => {
 *         capturedContext = context;
 *     },
 * });
 * vi.mock("@vueda/use/useTheme.js", () => ({
 *     useTheme: mockedUseTheme,
 *     THEME_OVERRIDE_PROPS: {},
 * }));
 */

/**
 * @typedef {(key: string, kwargs?: object) => string} SlotResolver
 */

/**
 * @typedef {((key: string, kwargs?: object) => string) & {
 *     componentName: string,
 *     es: { run: (fn: () => any) => any, stop: () => void, active: boolean },
 *     loading: { value: boolean | undefined },
 *     hideStyle: { value: string },
 * }} StubbedThemeFn
 */

/**
 * @typedef {object} MakeThemeFnOptions
 * @property {SlotResolver} [slotResolver] - Function that maps `(key, kwargs)` to the returned class string. Defaults to `() => "theme"`, matching the most common existing pattern.
 * @property {string} [componentName] - Value placed on the returned function's `componentName` property. Defaults to `"StubbedComponent"`.
 * @property {boolean | undefined} [loading] - Initial value of `loading.value`. Defaults to `false` (settled).
 * @property {string} [hideStyle] - Initial value of `hideStyle.value`. Defaults to `""`.
 * @property {import("vitest").Mock} [spy] - Pre-built `vi.fn()` to wrap so the caller can assert on slot calls. Its implementation is overwritten with `slotResolver`.
 */

/**
 * Create a stand-in for the callable returned by the real `useTheme`.
 *
 * The returned function is a Vitest mock that delegates to `slotResolver`, and
 * carries the same four auxiliary properties as the real return value.
 *
 * @param {MakeThemeFnOptions} [options] - Stub configuration.
 * @returns {StubbedThemeFn} A spy-able theme function with the full property shape.
 */
export function makeThemeFn(options = {}) {
    const {
        slotResolver = () => "theme",
        componentName = "StubbedComponent",
        loading = false,
        hideStyle = "",
        spy,
    } = options;

    const themeFn = spy ?? vi.fn();
    themeFn.mockImplementation(slotResolver);

    themeFn.componentName = componentName;
    // Effect scope stub. The real value is a Vue `EffectScope`; consumers in
    // tests only ever read `componentName`, `loading`, and `hideStyle`, but
    // the property is populated for completeness so future call sites that
    // touch `es.run(...)` do not fall over.
    themeFn.es = {
        active: true,
        run(fn) {
            return fn();
        },
        stop() {},
    };
    themeFn.loading = { value: loading };
    themeFn.hideStyle = { value: hideStyle };

    return themeFn;
}

/**
 * @typedef {object} MakeUseThemeMockOptions
 * @property {SlotResolver} [slotResolver] - Forwarded to {@link makeThemeFn} when `themeFn` is not supplied.
 * @property {StubbedThemeFn} [themeFn] - Pre-built theme function returned by every `useTheme(...)` call. When omitted, a fresh `themeFn` is created on each call (matching specs that did not need stable identity).
 * @property {(componentName: string, props: object, context: object, keyFn?: (key: string, kwargs: object) => string) => void} [onCall] - Side effect run before the theme function is returned. Useful for capturing the arguments passed to `useTheme`.
 * @property {string} [mockName] - Vitest mock name applied via `.mockName(...)`. Defaults to `"mockedUseTheme"`.
 */

/**
 * Create a `vi.fn()` shaped like the real `useTheme` export.
 *
 * @param {MakeUseThemeMockOptions} [options] - Mock configuration.
 * @returns {import("vitest").Mock} A `vi.fn()` whose return value is a {@link StubbedThemeFn}.
 */
export function makeUseThemeMock(options = {}) {
    const { slotResolver, themeFn, onCall, mockName = "mockedUseTheme" } = options;

    const mock = vi.fn((componentName, props, context, keyFn) => {
        if (onCall) {
            onCall(componentName, props, context, keyFn);
        }
        if (themeFn) {
            return themeFn;
        }
        return makeThemeFn({ slotResolver, componentName });
    });

    mock.mockName(mockName);
    return mock;
}
