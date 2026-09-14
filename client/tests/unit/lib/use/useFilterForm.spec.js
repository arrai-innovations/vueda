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

describe("lib/use/useFilterForm.js · query helpers", () => {
    let getFilterParams, getFilterQueryValue, buildFilterFromQuery, filtersToParams;
    beforeEach(async () => {
        const mod = await import("@vueda/use/useFilterForm.js");
        getFilterParams = mod.getFilterParams;
        getFilterQueryValue = mod.getFilterQueryValue;
        buildFilterFromQuery = mod.buildFilterFromQuery;
        filtersToParams = mod.filtersToParams;
    });
    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    scopedIt("getFilterParams returns the bare name, or suffixed keys for ranges", () => {
        expect(getFilterParams("name", { typeFilter: "CharField" })).toBe("name");
        expect(getFilterParams("created", { typeFilter: "DateRangeField", suffixes: ["min", "max"] })).toEqual([
            "created_min",
            "created_max",
        ]);
    });

    scopedIt("getFilterQueryValue reads suffix keys into an object", () => {
        const value = getFilterQueryValue(
            "created",
            { typeFilter: "DateRangeField", suffixes: ["min", "max"] },
            { created_min: "2026-01-01" },
        );
        expect(value).toEqual({ min: "2026-01-01" });
    });

    scopedIt("buildFilterFromQuery returns a filter object for a present simple value", () => {
        expect(buildFilterFromQuery("name", { typeFilter: "CharField" }, { name: "acme" })).toEqual({
            field: "name",
            expression: undefined,
            param: "name",
            value: "acme",
            range: false,
        });
    });

    scopedIt("buildFilterFromQuery coerces array filters and keeps range objects", () => {
        expect(buildFilterFromQuery("tags", { typeFilter: "ModelMultipleChoiceInField" }, { tags: "a" }).value).toEqual(
            ["a"],
        );
        const range = buildFilterFromQuery(
            "created",
            { typeFilter: "RangeField", suffixes: ["min", "max"] },
            { created_min: "1" },
        );
        expect(range).toMatchObject({ param: ["created_min", "created_max"], value: { min: "1" }, range: true });
    });

    scopedIt("buildFilterFromQuery returns null when the field is absent or empty", () => {
        expect(buildFilterFromQuery("name", { typeFilter: "CharField" }, {})).toBeNull();
        expect(buildFilterFromQuery("name", { typeFilter: "CharField" }, { name: "" })).toBeNull();
        expect(buildFilterFromQuery("created", { typeFilter: "RangeField", suffixes: ["min", "max"] }, {})).toBeNull();
        expect(buildFilterFromQuery("x", { typeFilter: "Bogus" }, { x: "1" })).toBeNull();
    });

    scopedIt("filtersToParams writes a bare-param filter to its param key", () => {
        expect(filtersToParams([{ field: "name", param: "name", value: "acme" }])).toEqual({ name: "acme" });
    });

    scopedIt("filtersToParams accumulates multiple filters into one object", () => {
        expect(
            filtersToParams([
                { field: "name", param: "name", value: "acme" },
                { field: "status", param: "status", value: "active" },
            ]),
        ).toEqual({ name: "acme", status: "active" });
    });

    scopedIt("filtersToParams returns an empty object for an empty filter list", () => {
        expect(filtersToParams([])).toEqual({});
    });

    scopedIt("filtersToParams splits a suffixed-param (range) filter's object value across each key", () => {
        expect(
            filtersToParams([
                { field: "created", param: ["created_min", "created_max"], value: { min: "1", max: "2" } },
            ]),
        ).toEqual({ created_min: "1", created_max: "2" });
    });

    scopedIt("filtersToParams defaults a missing suffix key to an empty string", () => {
        expect(
            filtersToParams([{ field: "created", param: ["created_min", "created_max"], value: { min: "1" } }]),
        ).toEqual({ created_min: "1", created_max: "" });
    });

    scopedIt("filtersToParams writes the same value to every suffix key when the value isn't an object", () => {
        expect(filtersToParams([{ field: "created", param: ["created_min", "created_max"], value: "1" }])).toEqual({
            created_min: "1",
            created_max: "1",
        });
    });

    scopedIt("filtersToParams unwraps a raw-object choice value to its .value", () => {
        expect(
            filtersToParams([
                { field: "owner", param: "owner", value: { value: "42", label: "Someone" }, isValueRawObject: true },
            ]),
        ).toEqual({ owner: "42" });
    });

    scopedIt("filtersToParams unwraps each item of a raw-object array value to its .value", () => {
        expect(
            filtersToParams([
                {
                    field: "tags",
                    param: "tags",
                    value: [
                        { value: "a", label: "A" },
                        { value: "b", label: "B" },
                    ],
                    isValueRawObject: true,
                },
            ]),
        ).toEqual({ tags: ["a", "b"] });
    });
});
