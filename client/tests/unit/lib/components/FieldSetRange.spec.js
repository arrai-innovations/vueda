import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";

const SimpleStub = (qa) =>
    defineComponent({
        name: `${qa}-stub`,
        setup(_, { slots }) {
            return () => h("div", { "data-qa": qa }, slots.default ? slots.default() : null);
        },
    });

const loggerWarn = vi.fn();
vi.mock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: () => ({ warn: loggerWarn }) }));

const fieldContext = {
    state: reactive({
        name: "range",
        label: "Range",
        value: null,
        help: "",
        errors: {},
        messages: {},
        formModelName: "range",
    }),
    deleteError: vi.fn(),
    updateError: vi.fn(),
};
vi.mock("@vueda/use/useField.js", () => ({ FIELD_PROPS: {}, FIELD_EMITS: [], useField: () => fieldContext }));

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: () => "theme-root" });

const mockedUseTheme = makeUseThemeMock({ themeFn });

vi.mock("@vueda/components/FieldRenderer.vue", () => ({ default: SimpleStub("field-renderer") }));
vi.mock("@vueda/shell/field/FieldDescription.vue", () => ({
    default: defineComponent({
        name: "FieldDescription",
        setup:
            (_, { slots }) =>
            () =>
                h("p", { "data-qa": "field-description" }, slots.default?.()),
    }),
}));
vi.mock("@vueda/shell/field/FieldMessage.vue", () => ({
    default: defineComponent({
        name: "FieldMessage",
        props: ["messages", "severity"],
        setup: (props) => () => h("div", { "data-qa": "field-message", "data-severity": props.severity ?? "error" }),
    }),
}));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
    mergeTheme: (...themes) => Object.assign({}, ...themes),
}));

let FieldSetRange;

beforeEach(async () => {
    FieldSetRange = (await import("@vueda/fields/FieldSetRange.vue")).default;
    fieldContext.state.value = null;
    fieldContext.deleteError.mockClear();
    fieldContext.updateError.mockClear();
    loggerWarn.mockClear();
    themeFn.mockClear();
});

describe("lib/fields/FieldSetRange.vue", () => {
    scopedIt("warns for invalid values", async () => {
        fieldContext.state.value = "bad";
        mount(FieldSetRange, { props: {} });
        await nextTick();
        expect(loggerWarn).toHaveBeenCalled();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");
    });

    scopedIt("updates error when lower is greater than upper", async () => {
        fieldContext.state.value = { lower: 1, upper: 2 };
        mount(FieldSetRange, { props: {} });
        await nextTick();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");

        fieldContext.deleteError.mockClear();
        fieldContext.state.value = { lower: 5, upper: 2 };
        await nextTick();
        expect(fieldContext.updateError).toHaveBeenCalledWith(
            "range",
            "The first value must be less than or equal to the second value.",
        );

        fieldContext.updateError.mockClear();
        fieldContext.state.value = { lower: 2, upper: 5 };
        await nextTick();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");
    });

    scopedIt("clears errors for empty range object", async () => {
        fieldContext.state.value = { lower: 1, upper: 2 };
        mount(FieldSetRange, { props: {} });
        await nextTick();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");

        fieldContext.deleteError.mockClear();
        fieldContext.state.value = {};
        await nextTick();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");
        expect(loggerWarn).not.toHaveBeenCalled();
        expect(fieldContext.updateError).not.toHaveBeenCalled();
    });

    scopedIt("handles zero boundaries correctly", async () => {
        fieldContext.state.value = { lower: 0, upper: 5 };
        mount(FieldSetRange, { props: {} });
        await nextTick();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");

        fieldContext.deleteError.mockClear();
        fieldContext.state.value = { lower: 5, upper: 0 };
        await nextTick();
        expect(fieldContext.updateError).toHaveBeenCalledWith(
            "range",
            "The first value must be less than or equal to the second value.",
        );

        fieldContext.updateError.mockClear();
        fieldContext.state.value = { lower: 0, upper: 0 };
        await nextTick();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");
    });
});
