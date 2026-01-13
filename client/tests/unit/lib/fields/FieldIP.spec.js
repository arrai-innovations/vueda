import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { h } from "vue";

const mockedUseField = vi.fn();
const mockedWatchIfDev = vi.fn();
const mockedUseDevLogger = vi.fn();

vi.mock("@vueda/use/useField.js", async () => {
    const actual = await vi.importActual("@vueda/use/useField.js");
    return { ...actual, useField: mockedUseField };
});
vi.mock("@vueda/utils/dev.js", () => ({ watchIfDev: mockedWatchIfDev }));
vi.mock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: mockedUseDevLogger }));

let FieldIP, vue, fieldContext, loggerWarn;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    fieldContext = { state: vue.reactive({ value: undefined }) };
    mockedUseField.mockReturnValue(fieldContext);
    loggerWarn = vi.fn();
    mockedUseDevLogger.mockReturnValue({ warn: loggerWarn });
    mockedWatchIfDev.mockImplementation((src, cb, opts) => {
        if (opts?.immediate) {
            cb(src());
        }
        return () => {};
    });
    FieldIP = (await import("@vueda/fields/FieldIP.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("renders slot props and passes attrs", () => {
    fieldContext.state.value = "1.2.3.4";
    const slotSpy = vi.fn(() => h("span", { "data-qa": "inner" }));
    mount(FieldIP, {
        props: { name: "ip" },
        attrs: { id: "ip1", class: "outer", other: "a" },
        slots: { default: slotSpy },
    });
    expect(mockedUseField).toHaveBeenCalled();
    expect(slotSpy).toHaveBeenCalledWith(
        expect.objectContaining({
            fieldAttrs: { id: "ip1", other: "a" },
            fieldProps: expect.objectContaining({ name: "ip" }),
        }),
    );
});

scopedIt("warns when value is not a string", () => {
    fieldContext.state.value = 1234;
    mount(FieldIP, { props: { name: "ip" } });
    expect(mockedWatchIfDev).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { immediate: true });
    expect(loggerWarn).toHaveBeenCalled();
});

scopedIt("does not warn for null or string values", () => {
    fieldContext.state.value = null;
    mount(FieldIP, { props: { name: "ip" } });
    expect(loggerWarn).not.toHaveBeenCalled();

    vi.clearAllMocks();
    fieldContext.state.value = "127.0.0.1";
    mount(FieldIP, { props: { name: "ip" } });
    expect(loggerWarn).not.toHaveBeenCalled();
});
