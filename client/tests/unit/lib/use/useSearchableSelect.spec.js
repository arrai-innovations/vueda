import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { reactive, ref } from "vue";

const listState = reactive({
    loading: false,
    objectsInOrder: [],
    pageToIds: new Map(),
    totalRecords: 0,
    totalPages: 0,
    perPage: 25,
});

// Mocks will be registered dynamically in beforeEach

vi.mock("lodash-es/debounce.js", () => ({
    default: (fn) => {
        const d = (...args) => fn(...args);
        d.cancel = vi.fn();
        return d;
    },
}));

describe("lib/use/useSearchableSelect.js", () => {
    let useSearchableSelect;
    let props, widgetContext, selectRef, modelConfig, lookup;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();

        modelConfig = reactive({
            info: { pk: "id" },
            config: { fetchFields: [], expand: [] },
            loading: false,
        });

        lookup = reactive({
            object: { id: 1, name: "one" },
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
                useList: vi.fn(() => ({ state: listState, clearList: vi.fn() })),
            };
        });

        const mod = await import("@vueda/use/useSearchableSelect.js");
        useSearchableSelect = mod.useSearchableSelect;

        Object.assign(listState, {
            loading: false,
            objectsInOrder: [],
            pageToIds: new Map(),
            totalRecords: 0,
            totalPages: 0,
            perPage: 25,
        });

        props = reactive({
            app: "app",
            model: "thing",
            modelFields: [],
            modelExpandFields: [],
            modelOrdering: [],
            optionValue: "id",
            optionLabel: "name",
            selectedOptionLabel: "name",
            placeholder: undefined,
            grouped: false,
            groupBy: undefined,
            isLazy: false,
            multiple: false,
            readonly: false,
            extraParams: {},
            getExtraParams: undefined,
        });

        widgetContext = { state: reactive({ combinedValue: null, dependencyValues: {} }) };
        selectRef = ref(null);
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    scopedIt("returns options from list when searching", async () => {
        const result = useSearchableSelect(props, widgetContext, selectRef);
        listState.objectsInOrder = [
            { id: 1, name: "A" },
            { id: 2, name: "B" },
        ];
        result.onBeforeShow();
        result.query = "a";
        await flushPromises();
        expect(result.options).toEqual(listState.objectsInOrder);
    });

    scopedIt("groups options when grouped", async () => {
        props.grouped = true;
        props.groupBy = "grp";
        const result = useSearchableSelect(props, widgetContext, selectRef);
        listState.objectsInOrder = [
            { id: 1, name: "A", grp: "g1" },
            { id: 2, name: "B", grp: "g2" },
            { id: 3, name: "C", grp: "g1" },
        ];
        result.onBeforeShow();
        result.query = "x";
        await flushPromises();
        expect(result.options.length).toBe(2);
        const g1 = result.options.find((g) => g.grp === "g1");
        const g2 = result.options.find((g) => g.grp === "g2");
        expect(g1.items.map((o) => o.id)).toEqual([1, 3]);
        expect(g2.items.map((o) => o.id)).toEqual([2]);
    });

    scopedIt("provides correct emptyMessage and selectedLabel", async () => {
        const result = useSearchableSelect(props, widgetContext, selectRef);
        expect(result.emptyMessage).toBe("Type to search for results.");
        listState.loading = true;
        await flushPromises();
        expect(result.emptyMessage).toBe("Loading...");
        listState.loading = false;
        result.query = "foo";
        await flushPromises();
        expect(result.emptyMessage).toBe("No matching results.");

        widgetContext.state.combinedValue = 1;
        lookup.object = { id: 1, name: "one" };
        lookup.loading = false;
        await flushPromises();
        expect(result.selectedLabel).toBe("one");
        lookup.loading = true;
        await flushPromises();
        expect(result.selectedLabel).toBe("\u00A0");
    });

    scopedIt("returns the selected value as the options", async () => {
        const result = useSearchableSelect(props, widgetContext, selectRef);
        widgetContext.state.combinedValue = 1;

        expect(result.options).toEqual([lookup.object]);
    });
});
