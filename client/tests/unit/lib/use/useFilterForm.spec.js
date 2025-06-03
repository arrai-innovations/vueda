import { scopedIt } from "@tests/unit/utils.js";
import { nextTick, reactive, ref } from "vue";

describe("lib/use/useFilterForm.js", () => {
    let useFilterField;
    beforeEach(async () => {
        useFilterField = (await import("@vueda/use/useFilterForm.js")).useFilterField;
    });
    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    scopedIt("returns defaults for CharField", async () => {
        const props = reactive({ filterName: "name", filterDetails: { typeFilter: "CharField" } });
        const queryValue = ref();
        const state = useFilterField(props, queryValue);
        await nextTick();
        expect(state.array).toBeUndefined();
        expect(state.range).toBeUndefined();
        expect(state.initialValues).toEqual({ name: "" });
    });

    scopedIt("coerces query value to array for ModelMultipleChoiceInField", async () => {
        const props = reactive({ filterName: "tags", filterDetails: { typeFilter: "ModelMultipleChoiceInField" } });
        const queryValue = ref("foo");
        const state = useFilterField(props, queryValue);
        await nextTick();
        expect(state.array).toBe(true);
        expect(state.initialValues).toEqual({ tags: ["foo"] });
    });

    scopedIt("initializes range fields", async () => {
        const props = reactive({
            filterName: "created",
            filterDetails: { typeFilter: "DateRangeField", suffixes: ["start", "end"] },
        });
        const queryValue = ref();
        const state = useFilterField(props, queryValue);
        await nextTick();
        expect(state.range).toBe(true);
        expect(state.initialValues).toEqual({ created: { start: null, end: null } });
    });

    scopedIt("throws when mapping missing", () => {
        const props = reactive({ filterName: "bad", filterDetails: { typeFilter: "Bogus" } });
        const queryValue = ref();
        expect(() => useFilterField(props, queryValue)).toThrow("bad: Missing mapping for filter type Bogus");
    });
});
