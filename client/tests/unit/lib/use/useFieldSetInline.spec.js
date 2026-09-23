import { mockProvideInject, scopedIt, withSetup } from "@tests/unit/utils.js";
import { FormContextSymbol, FormModelSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";

const { mockedProvide, mockedInject } = mockProvideInject(vi);

const breakpointsMock = { greaterOrEqual: vi.fn(() => ({ value: true })) };

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    return {
        __esModule: true,
        ...actual,
        provide: mockedProvide,
        inject: mockedInject,
        useSlots: vi.fn(() => ({})),
    };
});

vi.mock("@vueuse/core", () => ({
    useBreakpoints: vi.fn(() => breakpointsMock),
}));

vi.mock("@vueda/use/useFormModel.js", () => ({
    useFormModel: vi.fn(() => ({
        expandDetails: {},
        fields: [],
        expand: [],
    })),
}));

vi.mock("@vueda/use/useModelInitialValues.js", () => ({
    getFieldInitialValue: vi.fn((field) => `init-${field.fieldName}`),
}));

vi.mock("@vueda/use/useSlotNameResolver.js", () => ({
    useSlotNameResolver: vi.fn(() => ({ possibleNames: [] })),
}));

vi.mock("@vueda/utils/breakpoints.js", () => ({
    breakpointsVueda: {},
}));

describe("lib/use/useFieldSetInline.js", () => {
    let useFieldSetInline, useFormModel, vue;

    beforeEach(async () => {
        vue = await vi.importActual("vue");
        useFieldSetInline = await vi.importActual("@vueda/use/useFieldSetInline.js").then((m) => m.useFieldSetInline);
        useFormModel = (await import("@vueda/use/useFormModel.js")).useFormModel;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const mountFieldSet = async (propsOverrides = {}, contextOverrides = {}, options = {}) => {
        const parentFormModel = vue.reactive({
            app: "app",
            model: "model",
            view: "view",
            fields: [],
            expand: [],
            fieldDetails: {},
            expandDetails: {},
            fieldComponents: {},
            fieldProps: {},
            widgetComponents: {},
            widgetProps: {},
            ...contextOverrides.parentFormModel,
        });
        mockedProvide(FormModelSymbol, parentFormModel);
        mockedProvide(FormContextSymbol, contextOverrides.formContext ?? null);

        const fieldSetContext = {
            state: vue.reactive({
                name: "fs",
                formModelName: "fs",
                value: [],
                ...contextOverrides.contextState,
            }),
            blur: vi.fn(),
            ignore: vi.fn(),
            removeIgnore: vi.fn(),
            clearErrors: vi.fn(),
            clearMessages: vi.fn(),
            ...contextOverrides.fieldSetContext,
        };

        const props = vue.reactive({
            name: "fs",
            fieldObjects: [{ fieldName: "a" }, { fieldName: "b" }],
            ...propsOverrides,
        });

        const emit = vi.fn();
        const slotNames = [];
        const instance = await withSetup(() =>
            useFieldSetInline({
                props,
                emit,
                slotNames,
                fieldSetContext,
                ...options,
            }),
        );
        return { instance, props, fieldSetContext, emit };
    };

    scopedIt("getEmptyFieldObject returns initial values", async () => {
        const { instance } = await mountFieldSet();
        expect(instance.getEmptyFieldObject()).toEqual({ a: "init-a", b: "init-b" });
    });

    scopedIt("doCreate adds object and toggles visibility", async () => {
        const { instance, fieldSetContext } = await mountFieldSet({ hiddenByDefault: "always" });
        await flushPromises();
        expect(instance.state.internalVisible).toBe(false);
        instance.doCreate();
        expect(fieldSetContext.blur).toHaveBeenCalled();
        expect(fieldSetContext.state.value).toEqual([{ a: "init-a", b: "init-b" }]);
        expect(instance.state.focusIndex).toBe(0);
        expect(instance.state.internalVisible).toBe(true);
        expect(instance.state.userHasToggled).toBe(true);
    });

    scopedIt("Create requests controlled visibility without overriding the prop", async () => {
        const { instance, fieldSetContext, emit, props } = await mountFieldSet({ visible: false });
        instance.doCreate();
        expect(fieldSetContext.state.value).toHaveLength(1);
        expect(emit).toHaveBeenCalledExactlyOnceWith("update:visible", true);
        expect(instance.state.internalVisible).toBe(false);
        props.visible = true;
        await flushPromises();
        expect(instance.state.internalVisible).toBe(true);
    });

    scopedIt.each([
        [{ hiddenByDefault: "always" }, false],
        [{ hiddenByDefault: "never" }, true],
        [{ hidable: false, hiddenByDefault: "always" }, true],
        [{ visible: true, hiddenByDefault: "always" }, true],
        [{ visible: false, hiddenByDefault: "never" }, false],
    ])("initializes visibility for %j", async (props, expected) => {
        const { instance } = await mountFieldSet(props);
        expect(instance.state.internalVisible).toBe(expected);
    });

    scopedIt("follows defaults until the user chooses visibility", async () => {
        const { instance, props } = await mountFieldSet({ hiddenByDefault: "never" });
        props.hiddenByDefault = "always";
        await flushPromises();
        expect(instance.state.internalVisible).toBe(false);
        instance.setVisibility(true);
        props.hiddenByDefault = "never";
        await flushPromises();
        props.hiddenByDefault = "always";
        await flushPromises();
        expect(instance.state.internalVisible).toBe(true);
    });

    scopedIt("preserves an explicit destroy descriptor and other row actions without duplicates", async () => {
        const destroy = { fieldName: "destroy", action: true, label: "Remove", value: "custom" };
        const inspect = { fieldName: "inspect", action: vi.fn(), label: "Inspect" };
        const { instance, props } = await mountFieldSet({ fieldObjects: [destroy, inspect] });
        expect(instance.state.actions).toEqual([destroy, inspect]);
        props.readOnly = true;
        expect(instance.state.actions).toEqual([inspect]);
        props.readOnly = false;
        expect(instance.state.actions).toEqual([destroy, inspect]);
    });

    scopedIt("adds a default destroy action only when requested", async () => {
        const inspect = { fieldName: "inspect", action: vi.fn(), label: "Inspect" };
        const { instance } = await mountFieldSet({ fieldObjects: [inspect] });
        expect(instance.state.actions).toEqual([inspect]);
        const { instance: withDestroy } = await mountFieldSet(
            { fieldObjects: [inspect] },
            {},
            { addDestroyAction: true },
        );
        expect(withDestroy.state.actions).toEqual([
            inspect,
            { fieldName: "destroy", name: "fs.destroy", action: true, label: "Delete" },
        ]);
    });

    scopedIt("handleSelected updates selected array", async () => {
        const { instance, fieldSetContext } = await mountFieldSet();
        instance.handleSelected(true, 2);
        expect(instance.state.selected).toEqual([2]);
        expect(fieldSetContext.ignore).toHaveBeenCalledWith("fs[2]");

        instance.handleSelected(true, 2);
        expect(instance.state.selected).toEqual([2]);

        instance.handleSelected(false, 2);
        expect(instance.state.selected).toEqual([]);
        expect(fieldSetContext.removeIgnore).toHaveBeenCalledWith("fs[2]");
    });

    scopedIt("removeObject removes index and clears state", async () => {
        const { instance, fieldSetContext } = await mountFieldSet();
        fieldSetContext.state.value = [{ id: 1 }, { id: 2 }, { id: 3 }];
        instance.removeObject(1);
        expect(fieldSetContext.blur).toHaveBeenCalled();
        expect(fieldSetContext.state.value).toEqual([{ id: 1 }, { id: 3 }]);
        expect(fieldSetContext.clearErrors).toHaveBeenCalledWith(1);
        expect(fieldSetContext.clearMessages).toHaveBeenCalledWith(1);
    });

    scopedIt("removeObject removes through the form context and shifts selection", async () => {
        const formContext = { removeArrayItem: vi.fn() };
        const { instance, fieldSetContext } = await mountFieldSet({}, { formContext });
        instance.handleSelected(true, 0);
        instance.handleSelected(true, 2);
        fieldSetContext.ignore.mockClear();
        instance.removeObject(1);
        expect(fieldSetContext.blur).toHaveBeenCalled();
        expect(formContext.removeArrayItem).toHaveBeenCalledExactlyOnceWith("fs", 1);
        expect(instance.state.selected).toEqual([0, 1]);
        expect(fieldSetContext.ignore).not.toHaveBeenCalled();
        expect(fieldSetContext.removeIgnore).not.toHaveBeenCalled();
    });

    scopedIt("toggleVisibility modifies internal state when uncontrolled", async () => {
        const { instance, emit } = await mountFieldSet();
        const start = instance.state.internalVisible;
        instance.toggleVisibility();
        expect(instance.state.internalVisible).toBe(!start);
        expect(instance.state.userHasToggled).toBe(true);
        expect(emit).not.toHaveBeenCalled();
    });

    scopedIt("toggleVisibility emits update when visible prop used", async () => {
        const { instance, emit } = await mountFieldSet({ visible: true });
        await flushPromises();
        expect(instance.state.internalVisible).toBe(true);
        instance.toggleVisibility();
        expect(emit).toHaveBeenCalledWith("update:visible", false);
        expect(instance.state.internalVisible).toBe(true);
    });

    scopedIt("refFn stores element references", async () => {
        const { instance } = await mountFieldSet();
        const el = {
            scrollIntoView: vi.fn(),
            parentNode: { querySelector: vi.fn() },
            dataset: { rowIndex: undefined },
        };
        instance.refFn(el);
        expect(instance.state.itemRefs).toEqual([el]);
    });

    scopedIt("mergedFormModelProps merges values and reacts to prop changes", async () => {
        const { props } = await mountFieldSet(
            {
                fields: ["fs.child", "expandable"],
                expand: ["expandable"],
                fieldProps: { fs: { local: true } },
                fieldDetails: { "fs.child": { type: "string" } },
                expandDetails: { expandable: { type: "string" } },
            },
            { parentFormModel: { fields: ["parent"], fieldProps: { fs: { parent: true } } } },
        );

        const merged = useFormModel.mock.calls[0][0];

        expect(merged.name).toBe("fs");
        expect(merged.app).toBe("app");
        expect(merged.model).toBe("model");
        expect(merged.view).toBe("view");
        expect(merged.fields).toEqual(["parent", "fs.child", "expandable"]);
        expect(merged.fieldProps).toEqual({ fs: { parent: true, local: true } });
        expect(merged.fieldDetails).toEqual({ "fs.child": { type: "string" } });
        expect(merged.expandDetails).toEqual({ expandable: { type: "string" } });
        expect(merged.expand).toEqual(["expandable"]);

        props.fields.push("fs.extra");
        props.expand = [];
        props.fieldProps.fs.local = false;
        props.fieldDetails["fs.child"].type = "number";
        props.expandDetails.expandable.type = "number";
        await vue.nextTick();
        expect(merged.fields).toEqual(["parent", "fs.child", "expandable", "fs.extra"]);
        expect(merged.expand).toEqual([]);
        expect(merged.fieldProps.fs.local).toBe(false);
        expect(merged.fieldDetails["fs.child"].type).toBe("number");
        expect(merged.expandDetails.expandable.type).toBe("number");
    });

    scopedIt("fieldNames are derived from props.fields", async () => {
        const { instance, props } = await mountFieldSet({ fields: ["fs.one", "other", "fs.two"] });

        expect(instance.state.fieldNames).toEqual(["one", "two"]);

        props.fields.push("fs.three");
        await vue.nextTick();
        expect(instance.state.fieldNames).toEqual(["one", "two", "three"]);
    });
});
