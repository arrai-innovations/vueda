import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
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

vi.mock("@vueda/utils/buildForm.js", () => ({
    getFormChoresSlotNames: vi.fn(() => []),
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

    const mountFieldSet = (propsOverrides = {}, contextOverrides = {}) => {
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
        const instance = useFieldSetInline({
            props,
            emit,
            slotNames,
            fieldSetContext,
        });
        return { instance, props, fieldSetContext, emit };
    };

    scopedIt("getEmptyFieldObject returns initial values", async () => {
        const { instance } = mountFieldSet();
        expect(instance.getEmptyFieldObject()).toEqual({ a: "init-a", b: "init-b" });
    });

    scopedIt("doCreate adds object and toggles visibility", async () => {
        const { instance, fieldSetContext } = mountFieldSet({ visible: false });
        await flushPromises();
        expect(instance.state.internalVisible).toBe(false);
        instance.doCreate();
        expect(fieldSetContext.blur).toHaveBeenCalled();
        expect(fieldSetContext.state.value).toEqual([{ a: "init-a", b: "init-b" }]);
        expect(instance.state.focusIndex).toBe(0);
        expect(instance.state.internalVisible).toBe(true);
        expect(instance.state.userHasToggled).toBe(true);
    });

    scopedIt("handleSelected updates selected array", () => {
        const { instance, fieldSetContext } = mountFieldSet();
        instance.handleSelected(true, 2);
        expect(instance.state.selected).toEqual([2]);
        expect(fieldSetContext.ignore).toHaveBeenCalledWith("fs[2]");

        instance.handleSelected(true, 2);
        expect(instance.state.selected).toEqual([2]);

        instance.handleSelected(false, 2);
        expect(instance.state.selected).toEqual([]);
        expect(fieldSetContext.removeIgnore).toHaveBeenCalledWith("fs[2]");
    });

    scopedIt("removeObject removes index and clears state", () => {
        const { instance, fieldSetContext } = mountFieldSet();
        fieldSetContext.state.value = [{ id: 1 }, { id: 2 }, { id: 3 }];
        instance.removeObject(1);
        expect(fieldSetContext.blur).toHaveBeenCalled();
        expect(fieldSetContext.state.value).toEqual([{ id: 1 }, { id: 3 }]);
        expect(fieldSetContext.clearErrors).toHaveBeenCalledWith(1);
        expect(fieldSetContext.clearMessages).toHaveBeenCalledWith(1);
    });

    scopedIt("toggleVisibility modifies internal state when uncontrolled", () => {
        const { instance, emit } = mountFieldSet();
        const start = instance.state.internalVisible;
        instance.toggleVisibility();
        expect(instance.state.internalVisible).toBe(!start);
        expect(instance.state.userHasToggled).toBe(true);
        expect(emit).not.toHaveBeenCalled();
    });

    scopedIt("toggleVisibility emits update when visible prop used", async () => {
        const { instance, emit } = mountFieldSet({ visible: true });
        await flushPromises();
        expect(instance.state.internalVisible).toBe(true);
        instance.toggleVisibility();
        expect(emit).toHaveBeenCalledWith("update:visible", false);
        expect(instance.state.internalVisible).toBe(true);
    });

    scopedIt("refFn stores element references", () => {
        const { instance } = mountFieldSet();
        const el = {
            scrollIntoView: vi.fn(),
            parentNode: { querySelector: vi.fn() },
            dataset: { rowIndex: undefined },
        };
        instance.refFn(el);
        expect(instance.state.itemRefs).toEqual([el]);
    });

    scopedIt("mergedFormModelProps merges values and reacts to prop changes", async () => {
        const { props } = mountFieldSet(
            {
                fields: ["fs__child", "expandable"],
                expand: ["expandable"],
                fieldProps: { fs: { local: true } },
                fieldDetails: { fs__child: { type: "string" } },
                expandDetails: { expandable: { type: "string" } },
            },
            { parentFormModel: { fields: ["parent"], fieldProps: { fs: { parent: true } } } },
        );

        const merged = useFormModel.mock.calls[0][0];

        expect(merged.name).toBe("fs");
        expect(merged.app).toBe("app");
        expect(merged.model).toBe("model");
        expect(merged.view).toBe("view");
        expect(merged.fields).toEqual(["parent", "fs__child", "expandable"]);
        expect(merged.fieldProps).toEqual({ fs: { parent: true, local: true } });
        expect(merged.fieldDetails).toEqual({ fs__child: { type: "string" } });
        expect(merged.expandDetails).toEqual({ expandable: { type: "string" } });
        expect(merged.expand).toEqual(["expandable"]);

        props.fields.push("fs__extra");
        props.expand = [];
        props.fieldProps.fs.local = false;
        props.fieldDetails.fs__child.type = "number";
        props.expandDetails.expandable.type = "number";
        await vue.nextTick();
        expect(merged.fields).toEqual(["parent", "fs__child", "expandable", "fs__extra"]);
        expect(merged.expand).toEqual([]);
        expect(merged.fieldProps.fs.local).toBe(false);
        expect(merged.fieldDetails.fs__child.type).toBe("number");
        expect(merged.expandDetails.expandable.type).toBe("number");
    });

    scopedIt("fieldNames are derived from props.fields", async () => {
        const { instance, props } = mountFieldSet({ fields: ["fs__one", "other", "fs__two"] });

        expect(instance.state.fieldNames).toEqual(["one", "two"]);

        props.fields.push("fs__three");
        await vue.nextTick();
        expect(instance.state.fieldNames).toEqual(["one", "two", "three"]);
    });
});
