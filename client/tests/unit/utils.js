import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";

export function mockUseRoute(vi) {
    return vi.fn().mockName("mockedUseRoute");
}

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
export const expectReadOnlyFor = (name) => `'set' on proxy: trap returned falsish for property '${name}'`;

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
