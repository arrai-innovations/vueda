import { scopedIt, withSetup } from "@tests/unit/utils.js";
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

    scopedIt("computes props and slot names without field context", async () => {
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
        const result = await withSetup(() => useFieldRenderer(props, attrs, slots));

        expect(result.fieldSlotName.value).toBe("field(foo)");
        expect(result.widgetSlotName.value).toBe("widget(foo)");
        expect(result.widgetComponent.value).toEqual(availableWidgets.WidgetUnmapped);
        // Outside a fieldset, a plain undotted identity has nothing to protect from lodash nesting,
        // so it passes through unchanged: this is the same raw key `useForm`'s `errors`, `messages`,
        // and `touched` maps use, so a server error or touched-state lookup for this field agrees
        // with its value path.
        expect(result.fieldProps.value.name).toBe("foo");
        expect(result.fieldProps.value.modelValue).toBe("val");
        expect(result.fieldProps.value.hidden).toBe(false);
        expect(result.remainingSlots.value).toEqual(["custom"]);
        expect(result.fieldProps.value.themeOverride).toEqual({ a: 1, b: 2 });
        expect(result.widgetProps.value.themeOverride).toEqual({ a: 1, c: 3, b: 2 });
    });

    scopedIt("overrides label visibility only on the field and otherwise preserves model configuration", async () => {
        const props = vue.reactive({
            formModelName: "quantity",
            formModel: {
                fieldComponents: {},
                widgetComponents: {},
                fieldDetails: { quantity: { label: "Quantity" } },
                fieldProps: { quantity: { hideLabel: true } },
                widgetProps: {},
            },
            objectGridFieldSlotProps: {},
        });
        const result = await withSetup(() => useFieldRenderer(props, {}, {}));
        expect(result.fieldProps.value.hideLabel).toBe(true);
        props.hideLabel = false;
        expect(result.fieldProps.value.hideLabel).toBe(false);
        props.hideLabel = true;
        expect(result.fieldProps.value.hideLabel).toBe(true);
        expect(result.widgetProps.value).not.toHaveProperty("hideLabel");
    });

    scopedIt("reports a component resolution failure as field error state", async () => {
        const props = vue.reactive({
            formModelName: "foo",
            formModel: {
                fieldComponents: { foo: "FieldFoo" },
                get widgetComponents() {
                    throw new Error('No widget component named "WidgetNope" for field "foo" in app "a" model "b"');
                },
                fieldDetails: {},
                fieldProps: {},
                widgetProps: {},
            },
            objectGridFieldSlotProps: {},
        });
        const result = await withSetup(() => useFieldRenderer(props, {}, {}));

        expect(result.errored.value).toBe(true);
        expect(result.error.value.message).toContain('No widget component named "WidgetNope"');
        // No widget resolved, so the phrase names the field alone.
        expect(result.renderFailureText.value).toBe('rendering the "foo" field');
        expect(result.fieldComponent.value).toBeNull();
        expect(result.widgetComponent.value).toBeNull();
    });

    scopedIt("reports no error and names the widget when resolution succeeds", async () => {
        const props = vue.reactive({
            formModelName: "foo",
            formModel: {
                fieldComponents: { foo: "FieldFoo" },
                widgetComponents: { foo: { name: "WidgetTextInput" } },
                fieldDetails: {},
                fieldProps: {},
                widgetProps: {},
            },
            objectGridFieldSlotProps: {},
        });
        const result = await withSetup(() => useFieldRenderer(props, {}, {}));

        expect(result.errored.value).toBe(false);
        expect(result.error.value).toBeNull();
        expect(result.renderFailureText.value).toBe('rendering the "foo" field with WidgetTextInput');
    });

    scopedIt("computes fieldValuePath for object grid rows", async () => {
        const fieldSetContext = { state: vue.reactive({ name: "items", formModelName: "items" }) };
        const props = vue.reactive({
            formModelName: "items.name",
            formModel: {
                fieldComponents: { "items.name": "FieldString" },
                widgetComponents: {},
                fieldDetails: {},
                fieldProps: { "items.name": {} },
                widgetProps: { "items.name": {} },
            },
            objectGridFieldSlotProps: { rowIndex: 2, value: "v" },
        });
        const result = await withSetup(() => useFieldRenderer(props, {}, {}, fieldSetContext));
        expect(result.fieldValuePath.value).toBe("items[2].name");

        props.objectGridFieldSlotProps.rowIndex = 3;
        await flushPromises();
        expect(result.fieldValuePath.value).toBe("items[3].name");
    });
});
