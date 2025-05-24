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

let FieldEmail, vue, fieldContext, loggerWarn;

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
    FieldEmail = (await import("@vueda/fields/FieldEmail.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("renders slot props and passes attrs", () => {
    fieldContext.state.value = "foo@bar.com";
    const slotSpy = vi.fn(() => h("span", { "data-qa": "inner" }));
    mount(FieldEmail, {
        props: { name: "email" },
        attrs: { id: "eid", class: "outer", other: "a" },
        slots: { default: slotSpy },
    });
    expect(mockedUseField).toHaveBeenCalled();
    expect(slotSpy).toHaveBeenCalledWith(
        expect.objectContaining({
            fieldAttrs: { id: "eid", other: "a" },
            fieldProps: expect.objectContaining({ name: "email" }),
        }),
    );
});

scopedIt("warns when value is not a string", () => {
    fieldContext.state.value = 42;
    mount(FieldEmail, { props: { name: "email" } });
    expect(mockedWatchIfDev).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { immediate: true });
    expect(loggerWarn).toHaveBeenCalled();
});

scopedIt("does not warn for null or string values", () => {
    fieldContext.state.value = null;
    mount(FieldEmail, { props: { name: "email" } });
    expect(loggerWarn).not.toHaveBeenCalled();

    vi.clearAllMocks();
    fieldContext.state.value = "test@x.com";
    mount(FieldEmail, { props: { name: "email" } });
    expect(loggerWarn).not.toHaveBeenCalled();
});
