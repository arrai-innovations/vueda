import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";

const mockedUseField = vi.fn();
const mockedWarn = vi.fn();
const mockedUseDevLogger = vi.fn(() => ({ warn: mockedWarn }));

let FieldUUID, vue;
let originalDev, originalProd;

beforeEach(async () => {
    vi.doMock("@vueda/use/useField.js", async () => {
        const actual = await vi.importActual("@vueda/use/useField.js");
        return { ...actual, useField: mockedUseField };
    });
    vi.doMock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: mockedUseDevLogger }));

    vue = await import("vue");
    FieldUUID = (await import("@vueda/fields/FieldUUID.vue")).default;
    originalDev = import.meta.env.DEV;
    originalProd = import.meta.env.PROD;
    import.meta.env.DEV = true;
    import.meta.env.PROD = false;
    mockedUseField.mockReset();
    mockedWarn.mockReset();
    mockedUseDevLogger.mockClear();
});

afterEach(() => {
    import.meta.env.DEV = originalDev;
    import.meta.env.PROD = originalProd;
    vi.resetModules();
    vi.clearAllMocks();
});

scopedIt("passes slot props and no warning when value string", async () => {
    const fieldContext = { state: vue.reactive({ value: "abc" }) };
    mockedUseField.mockReturnValue(fieldContext);
    const slotFn = vi.fn(() => vue.h("div"));
    mount(FieldUUID, {
        props: { name: "uuid" },
        attrs: { id: "foo", class: "outer", "data-bar": "baz" },
        slots: { default: slotFn },
    });
    await flushPromises();
    expect(slotFn).toHaveBeenCalled();
    const slotProps = slotFn.mock.calls[0][0];
    expect(slotProps.fieldAttrs).toEqual({ id: "foo", "data-bar": "baz" });
    expect(slotProps.fieldProps.name).toBe("uuid");
    expect(mockedWarn).not.toHaveBeenCalled();
});

scopedIt("does nothing when value null or undefined", async () => {
    const fieldContext = { state: vue.reactive({ value: null }) };
    mockedUseField.mockReturnValue(fieldContext);
    mount(FieldUUID, { props: { name: "u" } });
    await flushPromises();
    expect(mockedWarn).not.toHaveBeenCalled();
});

scopedIt("warns when value is not a string", async () => {
    const fieldContext = { state: vue.reactive({ value: 123 }) };
    mockedUseField.mockReturnValue(fieldContext);
    mount(FieldUUID, { props: { name: "u" } });
    await flushPromises();
    expect(mockedWarn).toHaveBeenCalledWith("Expected value to be a string (UUID), got:", 123);
});
