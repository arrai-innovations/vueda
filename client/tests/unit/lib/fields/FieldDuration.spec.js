import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

let FieldDuration, vue, useFieldMock, useDevLoggerMock, logger;

beforeEach(async () => {
    useFieldMock = vi.fn();
    logger = { warn: vi.fn() };
    useDevLoggerMock = vi.fn(() => logger);
    vi.doMock("@vueda/use/useField.js", () => ({ FIELD_PROPS: {}, FIELD_EMITS: [], useField: useFieldMock }));
    vi.doMock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: useDevLoggerMock }));

    vue = await import("vue");
    FieldDuration = (await import("@vueda/fields/FieldDuration.vue")).default;
});

afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
});

scopedIt("renders root and passes slot props", () => {
    const state = vue.reactive({ value: { minutes: 5 } });
    useFieldMock.mockReturnValue({ state });
    const wrapper = mount(FieldDuration, {
        props: { name: "duration" },
        attrs: { class: "root-class", id: "field-id" },
        slots: {
            default: ({ fieldAttrs, fieldProps }) =>
                vue.h("span", {
                    "data-qa": "slot-props",
                    "data-id": fieldAttrs.id,
                    "data-unit": fieldProps.unit,
                }),
        },
    });

    expect(useFieldMock).toHaveBeenCalled();
    const root = wrapper.get("[data-qa='field-duration']");
    expect(root.classes()).toContain("root-class");
    const slot = wrapper.get("[data-qa='slot-props']");
    expect(slot.attributes("data-id")).toBe("field-id");
    expect(slot.attributes("data-unit")).toBe("minutes");
});

scopedIt("warns when value is not object", async () => {
    const state = vue.reactive({ value: "bad" });
    useFieldMock.mockReturnValue({ state });
    mount(FieldDuration, { props: { name: "duration" } });
    await vue.nextTick();
    expect(logger.warn).toHaveBeenCalledWith("Expected value to be a plain object for duration, got:", "bad");
});

scopedIt("warns when value becomes invalid", async () => {
    const state = vue.reactive({ value: { seconds: 1 } });
    useFieldMock.mockReturnValue({ state });
    mount(FieldDuration, { props: { name: "duration" } });
    await vue.nextTick();
    expect(logger.warn).not.toHaveBeenCalled();

    state.value = [1];
    await vue.nextTick();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith("Expected value to be a plain object for duration, got:", [1]);
});

scopedIt("does not warn for null or undefined values", async () => {
    const state = vue.reactive({ value: null });
    useFieldMock.mockReturnValue({ state });
    mount(FieldDuration, { props: { name: "duration" } });
    await vue.nextTick();
    expect(logger.warn).not.toHaveBeenCalled();

    logger.warn.mockClear();
    state.value = undefined;
    await vue.nextTick();
    expect(logger.warn).not.toHaveBeenCalled();
});
