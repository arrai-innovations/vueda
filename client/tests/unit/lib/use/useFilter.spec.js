import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { nextTick, reactive } from "vue";

vi.mock("@vueda/utils/buildForm.js", () => ({
    buildForm: (props, state) => ({
        setUpWatch: (listKey, detailKey) => {
            state[listKey] = props[listKey];
            if (detailKey) {
                state[detailKey] = props[detailKey];
            }
        },
        assignStateObjectsIfChanged: (obj) => Object.assign(state, obj),
        setFieldComponent: (name) => `${name}-field`,
        setFieldComponentProps: (name) => ({ name }),
        setWidgetComponent: (name) => `${name}-widget`,
        setWidgetComponentProps: (name) => ({ name }),
    }),
}));

describe("lib/use/useFilter.js", () => {
    let useFilter;
    beforeEach(async () => {
        useFilter = (await import("@vueda/use/useFilter.js")).useFilter;
    });
    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    scopedIt("builds field state for simple filters", async () => {
        const props = reactive({
            app: "a",
            model: "b",
            view: "list",
            filterables: ["status"],
            filterableDetails: { status: { typeFilter: "CharField" } },
        });
        const state = await withSetup(() => useFilter(props));
        await nextTick();
        expect(state.fieldComponents.status).toBe("status-field");
        expect(state.widgetComponents.status).toBe("status-widget");
    });

    scopedIt("handles range filters and boundary fields", async () => {
        const props = reactive({
            app: "a",
            model: "b",
            filterables: ["created"],
            filterableDetails: { created: { typeFilter: "DateRangeField", suffixes: ["after", "before"] } },
        });
        const state = await withSetup(() => useFilter(props));
        await nextTick();
        expect(state.fieldComponents).toHaveProperty("created.after");
        expect(state.fieldComponents).toHaveProperty("created.before");
        expect(state.widgetComponents).toHaveProperty("created.after");
        expect(state.widgetComponents.created).toBeUndefined();
    });

    scopedIt("builds boundary fields for a custom range type registered with range value handling", async () => {
        const { mergeFilterFieldMapping } = await import("@vueda/utils/fieldMappings.js");
        mergeFilterFieldMapping({ SpanField: { range: true, initialValue: { start: null, end: null } } });
        const props = reactive({
            app: "a",
            model: "b",
            filterables: ["span"],
            filterableDetails: { span: { typeFilter: "SpanField", suffixes: ["min", "max"] } },
        });
        const state = await withSetup(() => useFilter(props));
        await nextTick();
        expect(state.fieldComponents).toHaveProperty("span.min");
        expect(state.fieldComponents).toHaveProperty("span.max");
        expect(state.widgetComponents.span).toBeUndefined();
    });

    scopedIt("does not treat a filter as a range because of its type name", async () => {
        const props = reactive({
            app: "a",
            model: "b",
            filterables: ["arrangement"],
            filterableDetails: { arrangement: { typeFilter: "ArrangementField", suffixes: ["min", "max"] } },
        });
        const state = await withSetup(() => useFilter(props));
        await nextTick();
        expect(state.fieldComponents).not.toHaveProperty("arrangement.min");
        expect(state.widgetComponents.arrangement).toBe("arrangement-widget");
    });

    scopedIt("warns for unknown filter detail", async () => {
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        const props = reactive({
            app: "a",
            model: "b",
            filterables: ["foo"],
            filterableDetails: { foo: {} },
        });

        await withSetup(() => useFilter(props));

        expect(consoleWarnSpy).toHaveBeenCalledWith("Unknown typeFilter for filterable fields in a.b:", ["foo"]);

        consoleWarnSpy.mockRestore();
    });
});
