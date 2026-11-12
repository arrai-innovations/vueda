import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { reactive, ref } from "vue";

const mockModelInfo = reactive({
    info: {
        fields: {},
        filtering: {},
    },
});

vi.mock("@vueda/use/useModelInfo.js", () => ({
    useModelInfo: vi.fn(() => mockModelInfo),
}));

describe("lib/use/useModelInitialValues.js", () => {
    let useModelInitialValues, useModelFilterInitialValues, getFieldInitialValue;

    beforeEach(async () => {
        const mod = await import("@vueda/use/useModelInitialValues.js");
        useModelInitialValues = mod.useModelInitialValues;
        useModelFilterInitialValues = mod.useModelFilterInitialValues;
        getFieldInitialValue = mod.getFieldInitialValue;
        mockModelInfo.info.fields = {};
        mockModelInfo.info.filtering = {};
        vi.clearAllMocks();
    });

    scopedIt("getFieldInitialValue returns expected values", () => {
        expect(getFieldInitialValue({ many: true })).toBeUndefined();
        expect(
            getFieldInitialValue({
                many: false,
                typeSerializer: "CharField",
                typeModel: "CharField",
            }),
        ).toBe("");
        expect(
            getFieldInitialValue({
                many: false,
                typeSerializer: "BooleanField",
                typeModel: "BooleanField",
            }),
        ).toBe(false);
    });

    scopedIt("getFieldInitialValue falls back to the nearest ancestor that has a value", () => {
        const subclass = (typeSerializer, typeSerializerAncestors, typeModel) => ({
            many: false,
            typeSerializer,
            typeSerializerAncestors,
            typeModel,
        });
        expect(getFieldInitialValue(subclass("ActiveField", ["BooleanField"], "BooleanField"))).toBe(false);
        expect(getFieldInitialValue(subclass("ShoutField", ["CharField"], "TextField"))).toBe("");
        expect(getFieldInitialValue(subclass("ShoutField", ["CharField"], "UnknownField"))).toBeUndefined();
        expect(getFieldInitialValue(subclass("ShoutField", [], "TextField"))).toBeUndefined();
    });

    scopedIt("getFieldInitialValue prefers a value mapped for the subclass's own name", async () => {
        const { mergeModelInitialValuesMappings } = await import("@vueda/use/useModelInitialValues.js");
        const mappings = mergeModelInitialValuesMappings({ ShoutField: { TextField: "loud" } });
        try {
            const field = {
                many: false,
                typeSerializer: "ShoutField",
                typeSerializerAncestors: ["CharField"],
                typeModel: "TextField",
            };
            expect(getFieldInitialValue(field)).toBe("loud");
        } finally {
            delete mappings.ShoutField;
        }
    });

    scopedIt("computes initial values for fields and reacts to changes", async () => {
        mockModelInfo.info.fields = {
            pk: { many: false, typeSerializer: "IntegerField", typeModel: "AutoField" },
            name: { many: false, typeSerializer: "CharField", typeModel: "CharField" },
            active: { many: false, typeSerializer: "BooleanField", typeModel: "BooleanField" },
        };
        const fields = ref(["pk", "name", "active"]);

        const result = useModelInitialValues(ref("app"), ref("model"), fields);
        await flushPromises();
        expect(result.value).toEqual({ name: "", active: false });

        fields.value = ["name"];
        await flushPromises();
        expect(result.value).toEqual({ name: "" });

        mockModelInfo.info.fields = {
            name: { many: false, typeSerializer: "CharField", typeModel: "CharField" },
            age: { many: false, typeSerializer: "IntegerField", typeModel: "IntegerField" },
        };
        fields.value = ["name", "age"];
        await flushPromises();
        expect(result.value).toEqual({ name: "", age: null });
    });

    scopedIt("computes filter initial values and reacts to changes", async () => {
        mockModelInfo.info.filtering = {
            name: {
                lookupExprs: ["icontains", "exact"],
                many: false,
                typeSerializer: "CharField",
                typeModel: "CharField",
            },
            active: {
                lookupExprs: ["exact"],
                many: false,
                typeSerializer: "BooleanField",
                typeModel: "BooleanField",
            },
        };

        const result = useModelFilterInitialValues(ref("blog"), ref("post"));
        await flushPromises();
        expect(result.value).toEqual({
            "name.icontains": "",
            "name.exact": "",
            "active.exact": false,
        });

        mockModelInfo.info.filtering = {};
        await flushPromises();
        expect(result.value).toEqual({});
    });
});
