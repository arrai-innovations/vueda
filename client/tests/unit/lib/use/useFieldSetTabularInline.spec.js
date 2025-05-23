import { expectReadOnlyFor, scopedIt } from "@tests/unit/utils.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";

let useField, useFieldSetInline, useTheme, useBreakpoints, useFieldSetTabularInline, vue;

describe("lib/use/useFieldSetTabularInline.js", () => {
    beforeEach(async () => {
        vi.doMock("@vueda/use/useField.js", () => ({ FIELD_EMITS: [], useField: vi.fn() }));
        vi.doMock("@vueda/use/useFieldSetInline.js", () => ({
            FIELD_SET_INLINE_PROPS: {},
            useFieldSetInline: vi.fn(),
        }));
        vi.doMock("@vueda/use/useTheme.js", () => ({ useTheme: vi.fn() }));
        vi.doMock("@vueuse/core", () => ({ useBreakpoints: vi.fn() }));

        vue = await import("vue");
        useField = (await import("@vueda/use/useField.js")).useField;
        useFieldSetInline = (await import("@vueda/use/useFieldSetInline.js")).useFieldSetInline;
        useTheme = (await import("@vueda/use/useTheme.js")).useTheme;
        useBreakpoints = (await import("@vueuse/core")).useBreakpoints;
        useFieldSetTabularInline = (await import("@vueda/use/useFieldSetTabularInline.js")).useFieldSetTabularInline;
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    scopedIt("computes field objects and props", () => {
        const breakpointsInstance = {};
        useBreakpoints.mockReturnValue(breakpointsInstance);
        const themeFn = vi.fn();
        useTheme.mockReturnValue(themeFn);
        const fieldSetContext = { state: vue.reactive({ formModelName: "fm" }) };
        useField.mockReturnValue(fieldSetContext);
        const inlineState = vue.reactive({
            actions: [{ name: "destroy", action: true }],
            fieldObjects: [{ name: "destroy", action: true }, { name: "title" }],
        });
        const fieldSetInline = {
            state: inlineState,
            formModel: { fieldProps: { fm: { base: true } } },
            resolvedSlotNames: {},
            doCreate: vi.fn(),
            handleSelected: vi.fn(),
            refFn: vi.fn(),
            removeObject: vi.fn(),
            toggleVisibility: vi.fn(),
        };
        useFieldSetInline.mockReturnValue(fieldSetInline);

        const props = vue.reactive({ fieldProps: { override: 1 } });
        const emit = vi.fn();
        const result = useFieldSetTabularInline({ props, emit, slotNames: ["x"] });

        expect(useTheme).toHaveBeenCalledWith("FieldSetTabularInline", props);
        expect(useField).toHaveBeenCalledWith(props, emit);
        expect(useBreakpoints).toHaveBeenCalledWith(breakpointsVueda);
        expect(useFieldSetInline).toHaveBeenCalledWith({
            props,
            emit,
            slotNames: ["x"],
            fieldSetContext,
        });

        expect(result.state.computedFieldObjects).toEqual([{ name: "item-action-bar" }, { name: "title" }]);
        expect(result.state.computedFieldProps).toEqual({
            base: true,
            override: 1,
        });
    });

    scopedIt("handles isTable updates and readonly state", () => {
        useBreakpoints.mockReturnValue({});
        useTheme.mockReturnValue(vi.fn());
        const fieldSetContext = { state: vue.reactive({ formModelName: "fm" }) };
        useField.mockReturnValue(fieldSetContext);
        const fieldSetInline = {
            state: vue.reactive({ actions: [], fieldObjects: [] }),
            formModel: { fieldProps: { fm: {} } },
            resolvedSlotNames: {},
            doCreate: vi.fn(),
            handleSelected: vi.fn(),
            refFn: vi.fn(),
            removeObject: vi.fn(),
            toggleVisibility: vi.fn(),
        };
        useFieldSetInline.mockReturnValue(fieldSetInline);

        const props = vue.reactive({});
        const result = useFieldSetTabularInline({ props, emit: vi.fn(), slotNames: [] });

        expect(result.state.isTable).toBe(true);
        result.handleIsTableUpdate(false);
        expect(result.state.isTable).toBe(false);
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        result.state.isTable = true;
        expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(expectReadOnlyFor("isTable")), expect.anything());
        warnSpy.mockRestore();
    });

    scopedIt("omits action bar when there are no actions", () => {
        useBreakpoints.mockReturnValue({});
        useTheme.mockReturnValue(vi.fn());
        const fieldSetContext = { state: vue.reactive({ formModelName: "fm" }) };
        useField.mockReturnValue(fieldSetContext);
        const inlineState = vue.reactive({
            actions: [],
            fieldObjects: [{ name: "first" }, { name: "destroy", action: true }],
        });
        const fieldSetInline = {
            state: inlineState,
            formModel: { fieldProps: { fm: {} } },
            resolvedSlotNames: {},
            doCreate: vi.fn(),
            handleSelected: vi.fn(),
            refFn: vi.fn(),
            removeObject: vi.fn(),
            toggleVisibility: vi.fn(),
        };
        useFieldSetInline.mockReturnValue(fieldSetInline);

        const props = vue.reactive({});
        const result = useFieldSetTabularInline({ props, emit: vi.fn(), slotNames: [] });

        expect(result.state.computedFieldObjects).toEqual([{ name: "first" }]);
    });
});
