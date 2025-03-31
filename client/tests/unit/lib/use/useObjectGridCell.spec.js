import { useObjectGridCell } from "@vueda/use/useObjectGridCell.js";
import { unifiedGet } from "@vueda/utils/unifiedGet.js";
import { nextTick, reactive } from "vue";

vi.mock("@vueda/utils/unifiedGet.js", () => ({
    unifiedGet: vi.fn(),
}));

describe("useObjectGridCell", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls unifiedGet correctly for both formatted and value computed properties", async () => {
        const props = reactive({
            obj: { id: 1 },
            relatedObject: { id: 2 },
            calculatedObject: { id: 3 },
            field: {
                name: "fieldName",
                value: "fieldValue",
                formatted: "formattedField",
            },
        });

        unifiedGet.mockImplementation(() => "mocked result");

        const { formattedComputed, valueComputed } = useObjectGridCell(props);

        expect(formattedComputed.value).toBe("mocked result");
        expect(valueComputed.value).toBe("mocked result");

        expect(unifiedGet).toHaveBeenCalledWith(
            props.obj,
            props.relatedObject,
            props.calculatedObject,
            "formattedField",
        );

        expect(unifiedGet).toHaveBeenCalledWith(props.obj, props.relatedObject, props.calculatedObject, "fieldValue");
    });

    it("falls back to field.value or field.name when field.formatted is not provided", async () => {
        const props = reactive({
            obj: {},
            relatedObject: {},
            calculatedObject: {},
            field: {
                name: "fieldName",
                value: "fieldValue",
                formatted: null,
            },
        });

        unifiedGet.mockReturnValue("fallback result");

        const { formattedComputed } = useObjectGridCell(props);

        expect(formattedComputed.value).toBe("fallback result");
        expect(unifiedGet).toHaveBeenCalledWith(props.obj, props.relatedObject, props.calculatedObject, "fieldValue");

        // remove value to fallback further
        props.field.value = null;
        await nextTick();

        expect(formattedComputed.value).toBe("fallback result");
        expect(unifiedGet).toHaveBeenLastCalledWith(
            props.obj,
            props.relatedObject,
            props.calculatedObject,
            "fieldName",
        );
    });

    it("reacts to prop changes", async () => {
        const props = reactive({
            obj: { name: "A" },
            relatedObject: {},
            calculatedObject: {},
            field: { name: "fieldName" },
        });

        const callResults = ["first", "second"];
        let callIndex = 0;
        unifiedGet.mockImplementation(() => callResults[callIndex++]);

        const { valueComputed } = useObjectGridCell(props);

        expect(valueComputed.value).toBe("first");

        props.obj = { name: "B" };

        await nextTick();

        expect(valueComputed.value).toBe("second");
    });
});
