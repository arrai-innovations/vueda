vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    return {
        ...actual,
        useAttrs: vi.fn(() => ({
            "data-id": "123",
            "aria-label": "Close",
            foo: "bar",
            "custom-prop": "baz",
        })),
    };
});

describe("useFilteredAttrs", () => {
    let useFilteredAttrs, vue;

    beforeEach(async () => {
        useFilteredAttrs = (await import("@vueda/use/useFilteredAttrs.js")).useFilteredAttrs;
        vue = await import("vue");
    });
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("filters attrs from useAttrs with pickList", () => {
        const pickList = ["dataId", "foo"];
        const result = useFilteredAttrs(pickList, []);
        expect(result.value).toEqual({
            dataId: "123",
            foo: "bar",
        });
    });

    it("filters attrs from useAttrs with omitList", () => {
        const omitList = ["foo", "customProp"];
        const result = useFilteredAttrs([], omitList);
        expect(result.value).toEqual({
            dataId: "123",
            ariaLabel: "Close",
        });
    });

    it("applies pickList and then omitList", () => {
        const pickList = ["dataId", "foo", "customProp"];
        const omitList = ["foo"];
        const result = useFilteredAttrs(pickList, omitList);
        expect(result.value).toEqual({
            dataId: "123",
            customProp: "baz",
        });
    });

    it("accepts Sets as pick and omit lists", () => {
        const pickSet = new Set(["foo", "customProp"]);
        const omitSet = new Set(["customProp"]);
        const result = useFilteredAttrs(pickSet, omitSet);
        expect(result.value).toEqual({
            foo: "bar",
        });
    });

    it("normalizes kebab-case to camelCase in keys", () => {
        const pickList = ["ariaLabel", "dataId"];
        const result = useFilteredAttrs(pickList, []);
        expect(result.value).toEqual({
            dataId: "123",
            ariaLabel: "Close",
        });
    });

    it("works with explicitly passed reactive attrs", () => {
        const attrs = vue.ref({
            "some-attr": "value",
            other: "thing",
        });
        const pickList = ["someAttr"];
        const result = useFilteredAttrs(pickList, [], attrs);
        expect(result.value).toEqual({
            someAttr: "value",
        });

        // Reactivity check
        attrs.value.more = "stuff";
        expect(result.value).toEqual({
            someAttr: "value",
        });
    });
});
