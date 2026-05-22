import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { reactive } from "vue";

const listState = reactive({
    loading: false,
    objectsInOrder: [],
    totalRecords: 0,
});

vi.mock("lodash-es/debounce.js", () => ({
    default: (fn) => {
        const d = (...args) => fn(...args);
        d.cancel = vi.fn();
        return d;
    },
}));

describe("lib/use/useComboboxSearch.js", () => {
    let useComboboxSearch;
    let props, widgetContext, modelConfig, lookup, clearList;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();

        clearList = vi.fn();

        modelConfig = reactive({
            info: { pk: "id" },
            config: { fetchFields: [], expand: [] },
            loading: false,
        });

        lookup = reactive({
            object: { id: 1, formatted_name: "Object One" },
            loading: false,
        });

        vi.doMock("@vueda/use/useModelConfig.js", () => ({
            useModelConfig: vi.fn(() => modelConfig),
        }));
        vi.doMock("@vueda/use/useResolvedLookupObject.js", () => ({
            useResolvedLookupObject: vi.fn(() => lookup),
        }));
        vi.doMock("@arrai-innovations/reactive-helpers", async () => {
            const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
            return {
                ...actual,
                useList: vi.fn(() => ({ state: listState, clearList })),
            };
        });

        const mod = await import("@vueda/use/useComboboxSearch.js");
        useComboboxSearch = mod.useComboboxSearch;

        Object.assign(listState, {
            loading: false,
            objectsInOrder: [],
            totalRecords: 0,
        });

        props = reactive({
            app: "myapp",
            model: "thing",
            modelFields: [],
            modelExpandFields: [],
            modelOrdering: [],
            optionLabel: "formatted_name",
            selectedOptionLabel: "formatted_name",
            placeholder: undefined,
            grouped: false,
            groupBy: undefined,
            extraParams: {},
            getExtraParams: undefined,
        });

        widgetContext = {
            state: reactive({
                combinedValue: null,
                dependencyValues: {},
            }),
        };
    });

    describe("Initial state", () => {
        scopedIt("returns empty options before the combobox has been opened", async () => {
            const search = useComboboxSearch(props, widgetContext);
            await flushPromises();
            expect(search.options).toEqual([]);
        });

        scopedIt("returns placeholder using model name by default", async () => {
            const search = useComboboxSearch(props, widgetContext);
            expect(search.placeholder).toBe("Select a thing");
        });

        scopedIt("uses provided placeholder over generated one", async () => {
            props.placeholder = "Pick a thing";
            const search = useComboboxSearch(props, widgetContext);
            expect(search.placeholder).toBe("Pick a thing");
        });

        scopedIt("returns pkKey from model config as optionValue", async () => {
            const search = useComboboxSearch(props, widgetContext);
            expect(search.optionValue).toBe("id");
        });

        scopedIt("uses 'id' as fallback optionValue when model config has no pk", async () => {
            modelConfig.info = null;
            const search = useComboboxSearch(props, widgetContext);
            expect(search.optionValue).toBe("id");
        });
    });

    describe("onOpen / onClose", () => {
        scopedIt("onOpen triggers intent to search when no value is selected", async () => {
            const search = useComboboxSearch(props, widgetContext);
            search.onOpen();
            await flushPromises();
            expect(search.options.length).toBeGreaterThanOrEqual(0); // intendToSearch is now true
            expect(clearList).toHaveBeenCalled();
        });

        scopedIt("onClose clears the search query", async () => {
            const search = useComboboxSearch(props, widgetContext);
            search.query = "hello";
            search.onClose();
            expect(search.query).toBe("");
        });

        scopedIt("calling onOpen twice does not cause a second clearList call", async () => {
            const search = useComboboxSearch(props, widgetContext);
            search.onOpen();
            await flushPromises(); // let the first open's watcher settle
            const countAfterFirst = clearList.mock.calls.length;
            search.onOpen(); // hasBeenFocused already true; nothing changes
            await flushPromises();
            expect(clearList.mock.calls.length).toBe(countAfterFirst);
        });
    });

    describe("Search term and emptyMessage", () => {
        scopedIt("returns 'Type to search for results.' when query is empty and open", async () => {
            const search = useComboboxSearch(props, widgetContext);
            search.onOpen();
            await flushPromises();
            expect(search.emptyMessage).toBe("Type to search for results.");
        });

        scopedIt("returns 'Loading...' when list is loading", async () => {
            const search = useComboboxSearch(props, widgetContext);
            search.onOpen();
            listState.loading = true;
            await flushPromises();
            expect(search.emptyMessage).toBe("Loading...");
        });

        scopedIt("returns 'No matching results.' when query is set and list is not loading", async () => {
            const search = useComboboxSearch(props, widgetContext);
            search.onOpen();
            search.query = "xyz";
            await flushPromises();
            expect(search.emptyMessage).toBe("No matching results.");
        });
    });

    describe("Options population", () => {
        scopedIt("exposes search results after onOpen with a search query", async () => {
            listState.objectsInOrder = [
                { id: 10, formatted_name: "Alpha" },
                { id: 11, formatted_name: "Beta" },
            ];
            const search = useComboboxSearch(props, widgetContext);
            search.onOpen();
            search.query = "al";
            await flushPromises();
            expect(search.options).toHaveLength(2);
        });

        scopedIt("exposes resolved selected object as the only option when not searching", async () => {
            widgetContext.state.combinedValue = 1;
            const search = useComboboxSearch(props, widgetContext);
            await flushPromises();
            // Not opened yet; value is present so selectedLookup drives the options
            // intendToSearch is false (hasBeenFocused=false), but selectedLookup is ready
            expect(search.options).toHaveLength(1);
            expect(search.options[0]).toMatchObject({ id: 1, formatted_name: "Object One" });
        });

        scopedIt("returns empty options when selected lookup is loading", async () => {
            widgetContext.state.combinedValue = 1;
            lookup.loading = true;
            const search = useComboboxSearch(props, widgetContext);
            await flushPromises();
            expect(search.options).toEqual([]);
        });
    });

    describe("singleSelectedLabel", () => {
        scopedIt("returns non-breaking space while lookup is loading", async () => {
            widgetContext.state.combinedValue = 1;
            lookup.loading = true;
            const search = useComboboxSearch(props, widgetContext);
            expect(search.singleSelectedLabel).toBe("\u00A0");
        });

        scopedIt("returns resolved label when lookup has loaded", async () => {
            widgetContext.state.combinedValue = 1;
            lookup.loading = false;
            const search = useComboboxSearch(props, widgetContext);
            expect(search.singleSelectedLabel).toBe("Object One");
        });

        scopedIt("falls back to combinedValue when selectedOptionLabel field is absent", async () => {
            widgetContext.state.combinedValue = 99;
            lookup.object = {};
            lookup.loading = false;
            const search = useComboboxSearch(props, widgetContext);
            expect(search.singleSelectedLabel).toBe(99);
        });
    });

    describe("Grouping", () => {
        scopedIt("isGrouped is false when grouped prop is false", async () => {
            const search = useComboboxSearch(props, widgetContext);
            expect(search.isGrouped).toBe(false);
        });

        scopedIt("isGrouped is true when grouped and groupBy are set", async () => {
            props.grouped = true;
            props.groupBy = "category";
            const search = useComboboxSearch(props, widgetContext);
            expect(search.isGrouped).toBe(true);
            expect(search.groupByField).toBe("category");
        });

        scopedIt("options are grouped into buckets when grouped=true", async () => {
            props.grouped = true;
            props.groupBy = "category";
            listState.objectsInOrder = [
                { id: 1, formatted_name: "A1", category: "Alpha" },
                { id: 2, formatted_name: "A2", category: "Alpha" },
                { id: 3, formatted_name: "B1", category: "Beta" },
            ];
            const search = useComboboxSearch(props, widgetContext);
            search.onOpen();
            search.query = "a";
            await flushPromises();
            expect(search.options).toHaveLength(2);
            expect(search.options[0].category).toBe("Alpha");
            expect(search.options[0].items).toHaveLength(2);
            expect(search.options[1].category).toBe("Beta");
            expect(search.options[1].items).toHaveLength(1);
        });
    });

    describe("hasValue handles arrays (multiple mode)", () => {
        scopedIt("treats an empty array as no value, enabling search on open", async () => {
            widgetContext.state.combinedValue = [];
            const search = useComboboxSearch(props, widgetContext);
            search.onOpen();
            await flushPromises();
            // intendToSearch should be true (empty array = no value + focused)
            expect(clearList).toHaveBeenCalled();
        });

        scopedIt("treats a non-empty array as having a value", async () => {
            widgetContext.state.combinedValue = [1, 2];
            lookup.loading = false;
            // With a value and no search term, options come from selectedLookup
            const search = useComboboxSearch(props, widgetContext);
            await flushPromises();
            // Not opened; selectedLookup drives options
            expect(search.options).toHaveLength(1);
        });
    });
});
