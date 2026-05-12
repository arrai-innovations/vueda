import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { h, reactive, ref } from "vue";

const valueRef = ref("https://domain.invalid");
const mockedUseField = vi.fn(() => ({ state: reactive({ value: valueRef }) }));
vi.mock("@vueda/use/useField.js", () => ({ FIELD_EMITS: [], FIELD_PROPS: {}, useField: mockedUseField }));

const warnSpy = vi.fn();
vi.mock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: () => ({ warn: warnSpy }) }));

let FieldURL, vue;

beforeEach(async () => {
    vue = await import("vue");
    FieldURL = (await import("@vueda/fields/FieldURL.vue")).default;
    mockedUseField.mockClear();
    warnSpy.mockClear();
    valueRef.value = "https://domain.invalid";
});

scopedIt("forwards attrs to slot and warns for non-string values", async () => {
    const wrapper = mount(FieldURL, {
        attrs: { class: "outer", id: "el" },
        slots: {
            default: (slotProps) => h("input", { "data-qa": "slot", ...slotProps.fieldAttrs }),
        },
    });

    expect(wrapper.classes()).toContain("outer");
    expect(wrapper.get("[data-qa='slot']").attributes("id")).toBe("el");
    expect(warnSpy).not.toHaveBeenCalled();

    valueRef.value = 123;
    await vue.nextTick();

    expect(warnSpy).toHaveBeenCalledWith("Expected value to be a string (URL), got:", 123);
});

scopedIt("does not warn for null or undefined", async () => {
    valueRef.value = null;
    mount(FieldURL);
    expect(warnSpy).not.toHaveBeenCalled();

    valueRef.value = undefined;
    await vue.nextTick();
    expect(warnSpy).not.toHaveBeenCalled();
});
