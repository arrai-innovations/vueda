import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { DateTime } from "luxon";

let FieldDateTime, vue, useFieldMock, fieldContext, loggerWarn;

beforeEach(async () => {
    vi.resetModules();
    vue = await import("vue");
    loggerWarn = vi.fn();
    fieldContext = {
        state: vue.reactive({ value: null }),
        updateError: vi.fn(),
        deleteError: vi.fn(),
    };
    useFieldMock = vi.fn(() => fieldContext);
    vi.doMock("@vueda/use/useField.js", () => ({ FIELD_PROPS: {}, FIELD_EMITS: [], useField: useFieldMock }));
    vi.doMock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: () => ({ warn: loggerWarn }) }));
    FieldDateTime = (await import("@vueda/fields/FieldDateTime.vue")).default;
});

afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
});

scopedIt("validates against maxValue", async () => {
    fieldContext.state.value = new Date("2024-05-02T12:00:00Z");
    const max = new Date("2024-05-01T12:00:00Z");
    mount(FieldDateTime, { props: { name: "dt", maxValue: max } });
    const msg = `Must be ${DateTime.fromJSDate(max).toISO({ suppressMilliseconds: true })} or less.`;
    expect(fieldContext.updateError).toHaveBeenCalledWith("maxValue", msg);

    fieldContext.updateError.mockClear();
    fieldContext.deleteError.mockClear();
    fieldContext.state.value = new Date("2024-04-01T12:00:00Z");
    await vue.nextTick();
    expect(fieldContext.deleteError).toHaveBeenCalledWith("maxValue");
});

scopedIt("validates against minValue", async () => {
    fieldContext.state.value = new Date("2024-05-01T12:00:00Z");
    const min = new Date("2024-05-02T12:00:00Z");
    mount(FieldDateTime, { props: { name: "dt", minValue: min } });
    const msg = `Must be ${DateTime.fromJSDate(min).toISO({ suppressMilliseconds: true })} or more.`;
    expect(fieldContext.updateError).toHaveBeenCalledWith("minValue", msg);

    fieldContext.updateError.mockClear();
    fieldContext.deleteError.mockClear();
    fieldContext.state.value = new Date("2024-05-03T12:00:00Z");
    await vue.nextTick();
    expect(fieldContext.deleteError).toHaveBeenCalledWith("minValue");
});

scopedIt("warns for non-string or invalid values", async () => {
    fieldContext.state.value = 123;
    mount(FieldDateTime, { props: { name: "dt" } });
    expect(loggerWarn).toHaveBeenCalledWith(expect.stringContaining("Expected value to be a string"), 123);

    loggerWarn.mockClear();
    fieldContext.state.value = "bad";
    await vue.nextTick();
    expect(loggerWarn).toHaveBeenCalledWith(expect.stringContaining("not a valid ISO datetime"), "bad");
});

scopedIt("clears errors for null value", () => {
    fieldContext.state.value = null;
    mount(FieldDateTime, { props: { name: "dt", maxValue: new Date(), minValue: new Date() } });
    expect(fieldContext.deleteError).toHaveBeenCalledWith("maxValue");
    expect(fieldContext.deleteError).toHaveBeenCalledWith("minValue");
});

scopedIt("does not warn for null or valid ISO values", async () => {
    fieldContext.state.value = null;
    mount(FieldDateTime, { props: { name: "dt" } });
    expect(loggerWarn).not.toHaveBeenCalled();

    loggerWarn.mockClear();
    fieldContext.state.value = "2024-05-05T01:02:03Z";
    await vue.nextTick();
    expect(loggerWarn).not.toHaveBeenCalled();
});
