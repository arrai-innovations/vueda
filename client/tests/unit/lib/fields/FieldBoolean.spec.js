import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { h } from "vue";

const mockedUseField = vi.fn();
vi.mock("@vueda/use/useField.js", () => ({
    FIELD_PROPS: {},
    FIELD_EMITS: [],
    useField: mockedUseField,
}));

const warnSpy = vi.fn();
vi.mock("@vueda/use/useDevLogger.js", () => ({
    useDevLogger: () => ({ warn: warnSpy }),
}));

describe("lib/fields/FieldBoolean.vue", () => {
    let FieldBoolean, vue;
    beforeEach(async () => {
        vue = await vi.importActual("vue");
        FieldBoolean = (await import("@vueda/fields/FieldBoolean.vue")).default;
        mockedUseField.mockReset();
        warnSpy.mockClear();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });

    const mountWithValue = (value, options = {}) => {
        const fieldContext = { state: vue.reactive({ value }) };
        mockedUseField.mockReturnValue(fieldContext);
        const wrapper = mount(FieldBoolean, {
            props: { name: "bool", ...options.props },
            ...options,
        });
        return { wrapper, fieldContext };
    };

    scopedIt("warns when value is not a boolean", async () => {
        mountWithValue("nope");
        await vue.nextTick();
        expect(warnSpy).toHaveBeenCalledWith("Expected value to be a boolean, got:", "nope");
    });

    scopedIt("does not warn for boolean values", async () => {
        mountWithValue(false);
        await vue.nextTick();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    scopedIt("warns for null when nullable is false", async () => {
        mountWithValue(null);
        await vue.nextTick();
        expect(warnSpy).toHaveBeenCalledWith("Expected value to be a boolean, got:", null);
    });

    scopedIt("allows null when nullable and warns on later invalid value", async () => {
        const { fieldContext } = mountWithValue(null, { props: { nullable: true } });
        await vue.nextTick();
        expect(warnSpy).not.toHaveBeenCalled();
        fieldContext.state.value = 1;
        await vue.nextTick();
        expect(warnSpy).toHaveBeenCalledWith("Expected value to be a boolean or null, got:", 1);
    });

    scopedIt("does not warn for undefined and warns on later invalid value", async () => {
        const { fieldContext } = mountWithValue(undefined);
        await vue.nextTick();
        expect(warnSpy).not.toHaveBeenCalled();
        fieldContext.state.value = "bad";
        await vue.nextTick();
        expect(warnSpy).toHaveBeenCalledWith("Expected value to be a boolean, got:", "bad");
    });

    scopedIt("forwards non-class attrs to slot", async () => {
        const { wrapper } = mountWithValue(true, {
            attrs: { id: "id1", class: "root", disabled: "" },
            slots: {
                default: (slotProps) => h("input", { "data-qa": "inner", ...slotProps.fieldAttrs }),
            },
        });
        await vue.nextTick();
        expect(wrapper.classes()).toContain("root");
        expect(wrapper.attributes("id")).toBeUndefined();
        const input = wrapper.get('[data-qa="inner"]');
        expect(input.attributes("id")).toBe("id1");
        expect(input.attributes("disabled")).toBe("");
    });
});
