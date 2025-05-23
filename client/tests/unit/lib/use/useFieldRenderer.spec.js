import { scopedIt } from "@tests/unit/utils.js";
import { availableWidgets } from "@vueda/utils/formLookups.js";
import flushPromises from "flush-promises";

vi.mock("@vueda/use/useTheme.js", () => ({
    mergeTheme: vi.fn((...themes) => Object.assign({}, ...themes)),
}));
vi.mock("@vueda/utils/formLookups.js", async () => {
    const actual = await vi.importActual("@vueda/utils/formLookups.js");
    return {
        ...actual,
        availableWidgets: { WidgetUnmapped: { name: "WidgetUnmapped" } },
    };
});

describe("lib/use/useFieldRenderer.js", () => {
    let vue, useFieldRenderer;
    beforeEach(async () => {
        vue = await vi.importActual("vue");
        useFieldRenderer = (await vi.importActual("@vueda/use/useFieldRenderer.js")).useFieldRenderer;
    });
    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("computes props and slot names without field context", () => {
        const props = vue.reactive({
            formModelName: "foo",
            themeOverride: { b: 2 },
            formModel: {
                fieldComponents: { foo: "FieldFoo" },
                widgetComponents: {},
                fieldDetails: { foo: { label: "Foo" } },
                fieldProps: { foo: { themeOverride: { a: 1 } } },
                widgetProps: { foo: { themeOverride: { c: 3 } } },
            },
            objectGridFieldSlotProps: { value: "val" },
        });
        const attrs = { id: "id1", class: "cls", other: "attr" };
        const slots = { custom: () => {}, default: () => {}, [`field(foo)`]: () => {} };
        const result = useFieldRenderer(props, attrs, slots);

        expect(result.fieldSlotName.value).toBe("field(foo)");
        expect(result.widgetSlotName.value).toBe("widget(foo)");
        expect(result.widgetComponent.value).toEqual(availableWidgets.WidgetUnmapped);
        expect(result.fieldProps.value.name).toBe("foo");
        expect(result.fieldProps.value.modelValue).toBe("val");
        expect(result.widgetProps.value.hidden).toBe(false);
        expect(result.remainingSlots.value).toEqual(["custom"]);
        expect(result.fieldProps.value.themeOverride).toEqual({ a: 1, b: 2 });
        expect(result.widgetProps.value.themeOverride).toEqual({ a: 1, c: 3, b: 2 });
    });

    scopedIt("computes fieldValuePath for object grid rows", async () => {
        const fieldSetContext = { state: vue.reactive({ name: "items" }) };
        const props = vue.reactive({
            formModelName: "items__name",
            formModel: {
                fieldComponents: { items__name: "FieldString" },
                widgetComponents: {},
                fieldDetails: {},
                fieldProps: { items__name: {} },
                widgetProps: { items__name: {} },
            },
            objectGridFieldSlotProps: { rowIndex: 2, value: "v" },
        });
        const result = useFieldRenderer(props, {}, {}, fieldSetContext);
        expect(result.fieldValuePath.value).toBe("items[2].name");

        props.objectGridFieldSlotProps.rowIndex = 3;
        await flushPromises();
        expect(result.fieldValuePath.value).toBe("items[3].name");
    });
});
