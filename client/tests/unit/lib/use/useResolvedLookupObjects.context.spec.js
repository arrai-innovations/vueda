import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";

// Runs `useResolvedLookupObjects` under the real `useLookupContext`. Only the list and object managers that the context
// sends requests through are replaced.
let listSpies;
let retrieveSpies;
let failingRetrievePks;
let useLookupContext;
let useResolvedLookupObjects;
let vue;

beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    vi.clearAllMocks();
    listSpies = [];
    retrieveSpies = [];
    failingRetrievePks = new Set();

    vi.doMock("@vueda/stores/storeModelInfo.js", () => ({
        storeModelInfo: () => ({
            fetchModelInfo: () => Promise.resolve({ pk: "id" }),
        }),
    }));

    vi.doMock("@arrai-innovations/reactive-helpers", async () => {
        const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
        const { reactive } = await vi.importActual("vue");
        const crudArgs = (props) => ({ app: props.target.app, model: props.target.model, pkKey: props.pkKey });
        return {
            __esModule: true,
            ...actual,
            useObject: ({ props }) => {
                const state = reactive({ crud: { args: crudArgs(props) }, params: props.params, object: {} });
                const retrieve = vi.fn(() => {
                    if (failingRetrievePks.has(props.pk)) {
                        return actual.CancellablePromise(Promise.reject(new Error("not found")), vi.fn());
                    }
                    state.object = { id: Number(props.pk), formatted_name: `Object ${props.pk}` };
                    return actual.CancellablePromise(Promise.resolve(true), vi.fn());
                });
                retrieveSpies.push(retrieve);
                return { state, retrieve, clear: vi.fn() };
            },
            useList: ({ props }) => {
                const state = reactive({ crud: { args: crudArgs(props) }, params: props.params, objects: {} });
                const list = vi.fn(() => {
                    for (const pk of props.params.id) {
                        state.objects[pk] = { id: Number(pk), formatted_name: `Object ${pk}` };
                    }
                    return actual.CancellablePromise(Promise.resolve(true), vi.fn());
                });
                listSpies.push(list);
                return { state, list, clearList: vi.fn() };
            },
        };
    });

    vue = await vi.importActual("vue");
    useLookupContext = (await import("@vueda/use/useLookupContext.js")).useLookupContext;
    useResolvedLookupObjects = (await import("@vueda/use/useResolvedLookupObjects.js")).useResolvedLookupObjects;
});

afterEach(() => {
    vi.useRealTimers();
});

describe("lib/use/useResolvedLookupObjects.js with the lookup context", () => {
    // Mounts a parent that provides the lookup context and a child that resolves `pks` through it.
    const mountUnderLookupContext = (pks) => {
        const pksRef = vue.ref(pks);
        let lookup;
        let result;
        const Child = vue.defineComponent({
            setup() {
                result = useResolvedLookupObjects("app", "model", pksRef, ["formatted_name"], []);
                return () => null;
            },
        });
        const Parent = vue.defineComponent({
            setup() {
                lookup = useLookupContext();
                return () => vue.h(Child);
            },
        });
        const app = vue.createApp(Parent);
        app.mount(document.createElement("div"));
        onTestFinished(() => app.unmount());
        return { pksRef, lookup, result };
    };

    const settle = async () => {
        await vi.advanceTimersByTimeAsync(250);
        await flushPromises();
    };

    const retrieveCalls = () => retrieveSpies.reduce((count, spy) => count + spy.mock.calls.length, 0);
    const listCalls = () => listSpies.reduce((count, spy) => count + spy.mock.calls.length, 0);

    scopedIt("resolves two uncached primary keys with one list request and no retrieve request", async () => {
        const { result } = mountUnderLookupContext([13, 1]);
        await settle();

        expect(listCalls()).toBe(1);
        expect(retrieveCalls()).toBe(0);
        expect(result.objects["13"]).toMatchObject({ id: 13, formatted_name: "Object 13" });
        expect(result.objects["1"]).toMatchObject({ id: 1, formatted_name: "Object 1" });
        expect(result.errored).toBe(false);
    });

    scopedIt("keeps a cached object when the retrieve request for another primary key fails", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const { pksRef, result } = mountUnderLookupContext([13]);
        await settle();
        expect(result.objects["13"]).toMatchObject({ id: 13 });

        failingRetrievePks.add("1");
        pksRef.value = [13, 1];
        await settle();

        expect(result.objects["13"]).toMatchObject({ id: 13, formatted_name: "Object 13" });
        expect(result.objects["1"]).toBeUndefined();
        expect(result.errored).toBe(true);
        consoleError.mockRestore();
    });
});
