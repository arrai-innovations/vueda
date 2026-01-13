import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";

let FieldRange;
let lastFieldContext;
let originalDev;

beforeEach(async () => {
    originalDev = import.meta.env.DEV;
    import.meta.env.DEV = true;
    vi.doMock("@vueda/use/useField.js", () => {
        const vue = require("vue");
        return {
            FIELD_EMITS: [],
            FIELD_PROPS: {},
            useField: vi.fn((props) => {
                const ctx = {
                    state: vue.reactive({
                        name: props.name || "field",
                        value: props.modelValue,
                    }),
                };
                lastFieldContext = ctx;
                return ctx;
            }),
        };
    });
    FieldRange = (await import("@vueda/fields/FieldRange.vue")).default;
});

afterEach(() => {
    import.meta.env.DEV = originalDev;
    vi.resetModules();
    vi.clearAllMocks();
});

scopedIt("warns when value changes to a non-object", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(FieldRange, { props: { modelValue: { lower: 1, upper: 2 }, name: "r" } });
    await flushPromises();
    lastFieldContext.state.value = 5;
    await flushPromises();
    expect(warnSpy).toHaveBeenCalled();
});

scopedIt("warns when value changes to object missing keys", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(FieldRange, { props: { modelValue: { lower: 1, upper: 2 }, name: "r" } });
    await flushPromises();
    lastFieldContext.state.value = { lower: 1 };
    await flushPromises();
    expect(warnSpy).toHaveBeenCalled();
});

scopedIt("does not warn for valid range object", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(FieldRange, { props: { modelValue: { lower: 1, upper: 2 }, name: "r" } });
    await flushPromises();
    expect(warnSpy).not.toHaveBeenCalled();
});

scopedIt("reacts to valid value changes without warning", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(FieldRange, { props: { modelValue: { lower: 1, upper: 2 }, name: "r" } });
    await flushPromises();
    lastFieldContext.state.value = { lower: 2, upper: 3 };
    await flushPromises();
    expect(warnSpy).not.toHaveBeenCalled();
});
