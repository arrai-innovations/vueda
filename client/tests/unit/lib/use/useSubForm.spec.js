import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";

const { provideStore, mockedProvide, mockedInject } = mockProvideInject(vi);
vi.mock("vue", async () => {
    const original = await vi.importActual("vue");
    return {
        __esModule: true,
        ...original,
        provide: mockedProvide,
        inject: mockedInject,
    };
});

const getFormContextMock = (vue) => {
    return {
        state: vue.reactive({
            values: {},
            initialValues: {},
            errors: {},
            messages: {},
            touched: {},
            modified: {},
            required: {},
            valid: {},
            ignored: {},
            dependencyValues: {},
            labels: {},
            containerPaths: [],
            focused: null,
            anyErrors: false,
            anyMessages: false,
            anyTouched: false,
            anyModified: false,
            anyRequired: false,
            anyIgnored: false,
            submittingValues: {},
        }),
        reset: vi.fn(),
        getFirstErrorField: vi.fn(),
        updateValue: vi.fn(),
        deleteValue: vi.fn(),
        removeArrayItem: vi.fn(),
        updateInitialValue: vi.fn(),
        deleteInitialValue: vi.fn(),
        clearErrors: vi.fn(),
        updateError: vi.fn(),
        deleteError: vi.fn(),
        clearMessages: vi.fn(),
        updateMessage: vi.fn(),
        deleteMessage: vi.fn(),
        handleServerFormValidationError: vi.fn(),
        clearServerErrors: vi.fn(),
        setTouched: vi.fn(),
        setAllTouched: vi.fn(),
        clearTouched: vi.fn(),
        clearAllTouched: vi.fn(),
        focus: vi.fn(),
        blur: vi.fn(),
        ignore: vi.fn(),
        removeIgnore: vi.fn(),
        registerIsModifiedHook: vi.fn(),
        unregisterIsModifiedHook: vi.fn(),
        registerIsRequiredHook: vi.fn(),
        unregisterIsRequiredHook: vi.fn(),
        registerIsValidHook: vi.fn(),
        unregisterIsValidHook: vi.fn(),
        registerIsIgnoredHook: vi.fn(),
        unregisterIsIgnoredHook: vi.fn(),
        registerLabel: vi.fn(() => "label-registration-id"),
        unregisterLabel: vi.fn(),
    };
};

describe("lib/use/useSubForm.js", () => {
    let vue, useSubForm;
    beforeEach(async () => {
        vue = await vi.importActual("vue");
        useSubForm = (await vi.importActual("@vueda/use/useSubForm.js")).useSubForm;
        provideStore.clear();
        vi.clearAllMocks();
    });

    const mountSubForm = (parentState = {}, parentPath = "child") => {
        const fc = getFormContextMock(vue);
        Object.assign(fc.state, parentState);
        mockedInject.mockReturnValueOnce(fc);
        const subForm = useSubForm({ parentPath });
        return { subForm, fc };
    };

    scopedIt("provides itself under FormContextSymbol", () => {
        const { subForm } = mountSubForm();
        expect(mockedProvide).toHaveBeenCalledWith(FormContextSymbol, subForm);
    });

    scopedIt("syncs values from parent and reacts to changes", async () => {
        const parentState = {
            values: { child: { foo: 1 } },
            initialValues: { child: { foo: 1 } },
        };
        const { subForm, fc } = mountSubForm(parentState);
        expect(subForm.state.values).toEqual({ foo: 1 });
        expect(subForm.state.initialValues).toEqual({ foo: 1 });

        fc.state.values.child.bar = 2;
        fc.state.initialValues.child.bar = 2;
        await flushPromises();

        expect(subForm.state.values).toEqual({ foo: 1, bar: 2 });
        expect(subForm.state.initialValues).toEqual({ foo: 1, bar: 2 });

        delete fc.state.values.child.foo;
        await flushPromises();
        expect(subForm.state.values).toEqual({ bar: 2 });
    });

    scopedIt("creates refs to parent flat lists", async () => {
        const parentState = {
            errors: { "child.foo": { required: "msg" } },
        };
        const { subForm, fc } = mountSubForm(parentState);

        expect(subForm.state.errors["child.foo"]).toEqual({ required: "msg" });

        fc.state.errors["child.foo"] = { required: "updated" };
        await flushPromises();
        expect(subForm.state.errors["child.foo"]).toEqual({ required: "updated" });
    });

    scopedIt("prefixes field paths when calling parent methods", () => {
        const { subForm, fc } = mountSubForm();
        subForm.updateValue("foo", 1);
        subForm.updateValue("[0]", 2);
        subForm.removeArrayItem("emails", 1);
        expect(fc.updateValue).toHaveBeenCalledWith("child.foo", 1);
        expect(fc.updateValue).toHaveBeenCalledWith("child[0]", 2);
        expect(fc.removeArrayItem).toHaveBeenCalledWith("child.emails", 1);
    });

    scopedIt("registers labels under the prefixed path and unregisters by the parent's id", () => {
        const { subForm, fc } = mountSubForm();
        const labelHook = () => "Email";
        const id = subForm.registerLabel("email", labelHook);
        expect(fc.registerLabel).toHaveBeenCalledWith("child.email", labelHook);
        expect(id).toBe("label-registration-id");

        subForm.unregisterLabel(id);
        expect(fc.unregisterLabel).toHaveBeenCalledWith("label-registration-id");
    });

    scopedIt("maps focused state from parent", async () => {
        const parentState = { focused: "child.foo" };
        const { subForm, fc } = mountSubForm(parentState);
        expect(subForm.state.focused).toBe("foo");
        fc.state.focused = "other";
        await flushPromises();
        expect(subForm.state.focused).toBe(null);
    });
});
