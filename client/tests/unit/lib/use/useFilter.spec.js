import { scopedIt } from "@tests/unit/utils.js";
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
        const state = useFilter(props);
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
        const state = useFilter(props);
        await nextTick();
        expect(state.fieldComponents).toHaveProperty("created__after");
        expect(state.fieldComponents).toHaveProperty("created__before");
        expect(state.widgetComponents).toHaveProperty("created__after");
        expect(state.widgetComponents.created).toBeUndefined();
    });

    scopedIt("throws for unknown filter detail", () => {
        const props = reactive({
            app: "a",
            model: "b",
            filterables: ["foo"],
            filterableDetails: { foo: {} },
        });
        expect(() => useFilter(props)).toThrow("Unknown filterable field foo specified for a.b");
    });
});
