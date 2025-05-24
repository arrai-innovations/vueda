import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { h, nextTick, reactive, ref } from "vue";

const loggerWarn = vi.fn();
const mockedUseDevLogger = vi.fn(() => ({ warn: loggerWarn }));
vi.mock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: mockedUseDevLogger }));

let fieldContext;
const mockedUseField = vi.fn((props) => {
    fieldContext = { state: reactive({ value: ref(props.modelValue) }) };
    return fieldContext;
});
vi.mock("@vueda/use/useField.js", () => ({
    FIELD_EMITS: [],
    FIELD_PROPS: { name: {}, modelValue: {} },
    useField: mockedUseField,
}));

const importComponent = () => import("@vueda/fields/FieldArray.vue");

describe("lib/fields/FieldArray.vue", () => {
    beforeEach(() => {
        loggerWarn.mockClear();
        mockedUseDevLogger.mockClear();
        mockedUseField.mockClear();
        fieldContext = undefined;
    });

    scopedIt("warns when value is not array", async () => {
        const { default: FieldArray } = await importComponent();
        mount(FieldArray, {
            props: { name: "arr", modelValue: "oops" },
        });
        expect(loggerWarn).toHaveBeenCalledWith("Expected value to be an array or null/undefined, got:", "oops");

        loggerWarn.mockClear();
        fieldContext.state.value = [1, 2];
        await nextTick();
        expect(loggerWarn).not.toHaveBeenCalled();
    });

    scopedIt("passes attrs and props to slot", async () => {
        const { default: FieldArray } = await importComponent();
        const wrapper = mount(FieldArray, {
            props: { name: "arr", modelValue: [] },
            attrs: { class: "outer", id: "a1" },
            slots: {
                default: ({ fieldAttrs, fieldProps }) =>
                    h("span", { "data-qa": "slot", ...fieldAttrs, "data-name": fieldProps.name }),
            },
        });
        expect(wrapper.classes()).toContain("outer");
        const slot = wrapper.get("[data-qa='slot']");
        expect(slot.attributes("id")).toBe("a1");
        expect(slot.attributes("data-name")).toBe("arr");
        expect(slot.classes()).not.toContain("outer");
    });
});
