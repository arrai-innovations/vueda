import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";

const BoundaryStub = defineComponent({
    name: "BoundaryStub",
    props: ["name", "label", "id"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "boundary",
                    "data-name": props.name,
                    "data-label": props.label,
                    "data-id": props.id,
                },
                slots.default ? slots.default() : null,
            );
    },
});

const FormChoresStub = defineComponent({
    name: "FormChoresStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "form-chores" }, slots.default ? slots.default() : null);
    },
});

const loggerWarn = vi.fn();
vi.mock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: () => ({ warn: loggerWarn }) }));

const fieldContext = {
    state: reactive({ name: "range", label: "Range", value: null }),
    deleteError: vi.fn(),
    updateError: vi.fn(),
};
vi.mock("@vueda/use/useField.js", () => ({ FIELD_PROPS: {}, FIELD_EMITS: [], useField: () => fieldContext }));

const themeFn = vi.fn(() => "theme-root");
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: () => themeFn, THEME_OVERRIDE_PROPS: {} }));

vi.mock("@vueda/components/FormChores.vue", () => ({ default: FormChoresStub }));

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
    scopedIt("computes props for boundary components", () => {
        const wrapper = mount(FieldSetRange, {
            props: { boundaryComponent: BoundaryStub },
            attrs: { id: "the-id" },
        });
        const boundaries = wrapper.findAll('[data-qa="boundary"]');
        expect(boundaries).toHaveLength(2);
        expect(boundaries[0].attributes("data-name")).toBe("range.lower");
        expect(boundaries[0].attributes("data-label")).toBe("From");
        expect(boundaries[0].attributes("data-id")).toBe("the-id");
        expect(boundaries[1].attributes("data-name")).toBe("range.upper");
        expect(boundaries[1].attributes("data-label")).toBe("To");
    });

    scopedIt("warns for invalid values", async () => {
        fieldContext.state.value = "bad";
        mount(FieldSetRange, { props: { boundaryComponent: BoundaryStub } });
        await nextTick();
        expect(loggerWarn).toHaveBeenCalled();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");

        loggerWarn.mockClear();
        fieldContext.deleteError.mockClear();
        fieldContext.state.value = [1];
        await nextTick();
        expect(loggerWarn).toHaveBeenCalled();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");
    });

    scopedIt("updates error when lower is greater than upper", async () => {
        fieldContext.state.value = [1, 2];
        mount(FieldSetRange, { props: { boundaryComponent: BoundaryStub } });
        await nextTick();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");

        fieldContext.deleteError.mockClear();
        fieldContext.state.value = [5, 2];
        await nextTick();
        expect(fieldContext.updateError).toHaveBeenCalledWith(
            "range",
            "The first value must be less than or equal to the second value.",
        );

        fieldContext.updateError.mockClear();
        fieldContext.state.value = [2, 5];
        await nextTick();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");
    });

    scopedIt("clears errors for empty range array", async () => {
        fieldContext.state.value = [1, 2];
        mount(FieldSetRange, { props: { boundaryComponent: BoundaryStub } });
        await nextTick();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");

        fieldContext.deleteError.mockClear();
        fieldContext.state.value = [];
        await nextTick();
        expect(fieldContext.deleteError).toHaveBeenCalledWith("range");
        expect(loggerWarn).not.toHaveBeenCalled();
        expect(fieldContext.updateError).not.toHaveBeenCalled();
    });
});
