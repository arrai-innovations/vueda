import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";

// WARNING: do not import vue here. it will cause issues when mocking vue in a test

/**
 * Create a named mock for `useRoute()`.
 *
 * Useful when a test needs to stub `vue-router` and control what `useRoute()`
 * returns without importing the real router composable.
 *
 * @param {import("vitest").VitestUtils} vi - The Vitest instance.
 * @returns {import("vitest").Mock} A named mock function for `useRoute()`.
 */
export function mockUseRoute(vi) {
    return vi.fn().mockName("mockedUseRoute");
}

/**
 * Create paired mocks for Vue's `provide()` and `inject()`.
 *
 * Values written through `mockedProvide` are stored in an in-memory map so
 * `mockedInject` can read them back during the same test.
 *
 * @param {import("vitest").VitestUtils} vi - The Vitest instance.
 * @returns {{
 *   provideStore: Map<unknown, unknown>,
 *   mockedProvide: import("vitest").Mock,
 *   mockedInject: import("vitest").Mock
 * }} Mocked provide/inject helpers and their backing store.
 */
export function mockProvideInject(vi) {
    const provideStore = new Map();
    const mockedProvide = vi
        .fn()
        .mockName("mockedProvide")
        .mockImplementation((key, value) => provideStore.set(key, value));
    const mockedInject = vi
        .fn()
        .mockName("mockedInject")
        .mockImplementation((key) => provideStore.get(key));
    return { provideStore, mockedProvide, mockedInject };
}

/**
 * Create mocks for Vue lifecycle hooks and capture registered callbacks.
 *
 * Use this when testing composables or setup logic that registers lifecycle
 * hooks and you want to trigger those hooks manually.
 *
 * @param {import("vitest").VitestUtils} vi - The Vitest instance.
 * @returns {{
 *   mountedFunctions: (() => void)[],
 *   unmountedFunctions: (() => void)[],
 *   activatedFunctions: (() => void)[],
 *   deactivatedFunctions: (() => void)[],
 *   mockedOnMounted: import("vitest").Mock,
 *   mockedOnUnmounted: import("vitest").Mock,
 *   mockedOnActivated: import("vitest").Mock,
 *   mockedOnDeactivated: import("vitest").Mock,
 *   runMountedHooks: () => void,
 *   runUnmountedHooks: () => void,
 *   runActivatedHooks: () => void,
 *   runDeactivatedHooks: () => void,
 *   clearMounted: () => void,
 *   clearUnmounted: () => void,
 *   clearActivated: () => void,
 *   clearDeactivated: () => void
 * }} Lifecycle hook mocks, captured callbacks, and test helpers.
 */
export function mockLifecycle(vi) {
    const mountedFunctions = [];
    const unmountedFunctions = [];
    const activatedFunctions = [];
    const deactivatedFunctions = [];

    const mockedOnMounted = vi
        .fn()
        .mockName("mockedOnMounted")
        .mockImplementation((fn) => mountedFunctions.push(fn));

    const mockedOnUnmounted = vi
        .fn()
        .mockName("mockedOnUnmounted")
        .mockImplementation((fn) => unmountedFunctions.push(fn));

    const mockedOnActivated = vi
        .fn()
        .mockName("mockedOnActivated")
        .mockImplementation((fn) => activatedFunctions.push(fn));

    const mockedOnDeactivated = vi
        .fn()
        .mockName("mockedOnDeactivated")
        .mockImplementation((fn) => deactivatedFunctions.push(fn));

    return {
        mountedFunctions,
        unmountedFunctions,
        activatedFunctions,
        deactivatedFunctions,

        mockedOnMounted,
        mockedOnUnmounted,
        mockedOnActivated,
        mockedOnDeactivated,

        runMountedHooks: () => {
            for (const fn of mountedFunctions) {
                fn();
            }
        },
        runUnmountedHooks: () => {
            for (const fn of unmountedFunctions) {
                fn();
            }
        },
        runActivatedHooks: () => {
            for (const fn of activatedFunctions) {
                fn();
            }
        },
        runDeactivatedHooks: () => {
            for (const fn of deactivatedFunctions) {
                fn();
            }
        },

        clearMounted: () => {
            mountedFunctions.length = 0;
        },
        clearUnmounted: () => {
            unmountedFunctions.length = 0;
        },
        clearActivated: () => {
            activatedFunctions.length = 0;
        },
        clearDeactivated: () => {
            deactivatedFunctions.length = 0;
        },
    };
}

/**
 * Register one or two watchers against a props object and expose their spies.
 *
 * This helper is useful when a test needs to assert that a watch source reacts
 * to one path and optionally ignores another.
 *
 * @param {typeof import("vue")} vue - The mocked or real Vue module.
 * @param {{ [key: string]: unknown }} props - The object being watched.
 * @param {string} pos - The positive watch path to assert.
 * @param {string|false} [neg=false] - An optional second watch path to assert separately.
 * @param {boolean} [deep=false] - Whether to deep-clone watch sources before tracking changes.
 * @returns {[() => void, import("vitest").Mock, import("vitest").Mock|undefined]} Stop function and watcher spies.
 */
export function testWatches(vue, props, pos, neg = false, deep = false) {
    const stopFns = [];
    const stop = () => {
        for (const stopFn of stopFns) {
            stopFn();
        }
    };
    const posWatch = deep ? () => cloneDeep(get(props, pos)) : get.bind(null, props, pos);
    const negWatch = neg && deep ? () => cloneDeep(get(props, neg)) : get.bind(null, props, neg);
    const posFn = vi.fn();
    const negFn = neg ? vi.fn() : undefined;
    stopFns.push(vue.watch(posWatch, posFn, { deep }));
    if (negFn) {
        stopFns.push(vue.watch(negWatch, negFn, { deep }));
    }
    return [stop, posFn, neg ? negFn : undefined];
}

/**
 * Expected error message string for attempting to assign to a readonly proxy.
 *
 * This works when Vue **throws** (e.g. assigning to a readonly `reactive` object's top-level property),
 * but not when Vue only **warns** (e.g. setting `.value` of a `readonly(ref)`).
 *
 * In those cases, use a `console.warn` spy instead of `toThrow()`.
 *
 * @param {string} name - The name of the property being set.
 * @returns {string} The expected error message substring.
 */
export const expectReadOnlyFor = (name) =>
    new RegExp(`(?:target is readonly.*${name}|${name}.*target is readonly|trap returned falsish.*${name})`);

/**
 * Expect that executing the callback triggers a Vue readonly warning for the given property name.
 *
 * Vue 3.5.19 switched to give warnings instead of throwing an error when updating a nested readonly
 *
 * @param {() => void} fn - The function expected to trigger a readonly warning.
 * @param {string} name - The property involved in the readonly assignment.
 */
export const expectReadOnlyWarning = (fn, name) => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    fn();
    const calls = warnSpy.mock.calls.map((args) => String(args[0]));
    warnSpy.mockRestore();
    const matched = calls.some((message) => expectReadOnlyFor(name).test(message));
    expect(matched).toBe(true);
};

/**
 * Create mocks for Vue Router leave and update guards.
 *
 * Use this when a composable or component registers `onBeforeRouteLeave()` or
 * `onBeforeRouteUpdate()` and the test needs to invoke those guards manually.
 *
 * @param {import("vitest").VitestUtils} vi - The Vitest instance.
 * @returns {{
 *   leaveFns: (() => void)[],
 *   updateFns: (() => void)[],
 *   mockedOnBeforeRouteLeave: import("vitest").Mock,
 *   mockedOnBeforeRouteUpdate: import("vitest").Mock,
 *   runLeaveHooks: () => void,
 *   runUpdateHooks: () => void,
 *   clearLeave: () => void,
 *   clearUpdate: () => void
 * }} Router lifecycle mocks, captured guards, and test helpers.
 */
export const mockVueRouterLifecycle = (vi) => {
    const leaveFns = [];
    const updateFns = [];

    const mockedOnBeforeRouteLeave = vi
        .fn()
        .mockName("mockedBeforeRouteLeave")
        .mockImplementation((fn) => leaveFns.push(fn));

    const mockedOnBeforeRouteUpdate = vi
        .fn()
        .mockName("mockedBeforeRouteUpdate")
        .mockImplementation((fn) => updateFns.push(fn));

    return {
        leaveFns,
        updateFns,
        mockedOnBeforeRouteLeave,
        mockedOnBeforeRouteUpdate,
        runLeaveHooks: () => {
            for (const fn of leaveFns) {
                fn();
            }
        },
        runUpdateHooks: () => {
            for (const fn of updateFns) {
                fn();
            }
        },
        clearLeave: () => {
            leaveFns.length = 0;
        },
        clearUpdate: () => {
            updateFns.length = 0;
        },
    };
};

/**
 * Create mocks for `addEventListener()` and `removeEventListener()`.
 *
 * Registered listeners are stored in-memory so tests can inspect which handlers
 * were added or removed.
 *
 * @param {import("vitest").VitestUtils} vi - The Vitest instance.
 * @returns {{
 *   eventListeners: {event: string, fn: Function}[],
 *   mockedAddEventListener: import("vitest").Mock,
 *   mockedRemoveEventListener: import("vitest").Mock,
 *   clear: () => void
 * }} Event listener mocks and the recorded listeners.
 */
export const mockEventListener = (vi) => {
    const eventListeners = [];
    const mockedAddEventListener = vi
        .fn()
        .mockName("mockedAddEventListener")
        .mockImplementation((event, fn) => {
            eventListeners.push({ event, fn });
        });
    const mockedRemoveEventListener = vi
        .fn()
        .mockName("mockedRemoveEventListener")
        .mockImplementation((event, fn) => {
            const index = eventListeners.findIndex((el) => el.event === event && el.fn === fn);
            if (index !== -1) {
                eventListeners.splice(index, 1);
            }
        });
    return {
        eventListeners,
        mockedAddEventListener,
        mockedRemoveEventListener,
        clear: () => {
            eventListeners.length = 0;
        },
    };
};

/**
 * Run a composable inside a synthetic component setup() so it has a real
 * component instance for provide(), inject(), and lifecycle hooks.
 *
 * The synthetic app is unmounted automatically when the test finishes.
 *
 * @param {() => T} composable - Invoked once during setup; its return value is forwarded to the caller.
 * @returns {Promise<T>} The composable's return value.
 * @template T
 */
export async function withSetup(composable) {
    const { createApp } = await vi.importActual("vue");
    let result;
    const app = createApp({
        setup() {
            result = composable();
            return () => null;
        },
    });
    app.mount(document.createElement("div"));
    onTestFinished(() => app.unmount());
    return result;
}

/**
 * Run a test in a fresh Vue effect scope.
 *
 * Use for tests that touch Vue reactivity, lifecycle hooks, provide/inject,
 * composables, or mounted components.
 *
 * Do not use for plain non-Vue utility tests where normal `it()` is enough.
 *
 * @param {string} name - The name of the test.
 * @param {() => Promise<void>|void} fn - The test function.
 * @param {number} [timeout] - The timeout for the test.
 */
export const scopedIt = (name, fn, timeout) => {
    it(
        name,
        async () => {
            const { effectScope } = await vi.importActual("vue");
            const scope = effectScope();
            try {
                await scope.run(fn);
            } finally {
                scope.stop();
            }
        },
        timeout,
    );
};
["only", "skip", "concurrent", "sequential", "fails"].forEach((method) => {
    scopedIt[method] = (name, fn, timeout) => {
        it[method](
            name,
            async () => {
                const { effectScope } = await vi.importActual("vue");
                const scope = effectScope();
                try {
                    await scope.run(fn);
                } finally {
                    scope.stop();
                }
            },
            timeout,
        );
    };
});
/**
 * Run a test in a Vue effect scope.
 * @param {string} name - The name of the test.
 */
scopedIt.todo = (name) => {
    it.todo(name);
};
/**
 * Run a test in a Vue effect scope with multiple cases.
 * @param {Array} cases - The cases to run the test with.
 */
scopedIt.each = (cases) => {
    const eachFn = it.each(cases);
    return (name, fn, timeout) => {
        eachFn(
            name,
            async (...args) => {
                const { effectScope } = await vi.importActual("vue");
                const scope = effectScope();
                try {
                    await scope.run(() => fn(...args));
                } finally {
                    scope.stop();
                }
            },
            timeout,
        );
    };
};
/**
 * Run a test in a Vue effect scope with multiple cases.
 * @param {Array} cases - The cases to run the test with.
 */
scopedIt.for = (cases) => {
    const forFn = it.for(cases);
    return (name, maybeOptionsOrFn, maybeFnOrNothing) => {
        const isOptionsFirst = typeof maybeOptionsOrFn === "object" && typeof maybeFnOrNothing === "function";

        const options = isOptionsFirst ? maybeOptionsOrFn : { timeout: maybeFnOrNothing };
        const fn = isOptionsFirst ? maybeFnOrNothing : maybeOptionsOrFn;

        forFn(name, options, async (arg, context) => {
            const vue = await vi.importActual("vue");
            const scope = vue.effectScope();
            try {
                await scope.run(() => fn(arg, context));
            } finally {
                scope.stop();
            }
        });
    };
};
