import cloneDeep from "lodash-es/cloneDeep.js";
import get from "lodash-es/get.js";

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

export function mockUnmounted(vi) {
    const unmountFunctions = [];
    const mockedOnUnmounted = vi
        .fn()
        .mockName("mockedOnUnmounted")
        .mockImplementation((fn) => {
            unmountFunctions.push(fn);
        });
    return {
        unmountFunctions,
        mockedOnUnmounted,
        clearUnmounted: () => {
            unmountFunctions.length = 0;
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

export const expectReadOnlyFor = (name) => `'set' on proxy: trap returned falsish for property '${name}'`;
