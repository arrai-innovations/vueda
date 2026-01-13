import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { DateTime } from "luxon";
import { defineComponent, h, ref } from "vue";

const DatePickerStub = defineComponent({
    name: "DatePickerStub",
    props: ["modelValue"],
    emits: ["update:modelValue", "blur", "focus", "input", "today-click"],
    setup(props, { emit }) {
        return () =>
            h("input", {
                "data-qa": "prime-datepicker",
                value: props.modelValue,
                onInput: (e) => emit("input", e),
                onBlur: (e) => emit("blur", e),
                onFocus: () => emit("focus"),
                onTodayClick: () => emit("today-click"),
            });
    },
});
vi.mock("primevue/datepicker", () => ({ default: DatePickerStub }));

const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    props: ["for"],
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "widget-label-stub" }, slots.default ? slots.default({ class: "" }) : null);
    },
});
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS: {},
    getWidgetSlotsComputed: () => () => [],
}));

const mockedUseWidgetTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: mockedUseWidgetTheme }));

const mockedUseWarningClass = vi.fn(() => ref({}));
vi.mock("@vueda/use/useWarningClass.js", () => ({
    useWarningClass: mockedUseWarningClass,
    PASSTHROUGH_OPTION_PROPS: {},
}));

vi.mock("@vueda/use/useDevLogger.js", () => ({
    useDevLogger: () => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

let WidgetDatePicker;

beforeEach(async () => {
    WidgetDatePicker = (await import("@vueda/widgets/WidgetDatePicker.vue")).default;
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

scopedIt("parses input formats", () => {
    const wrapper = mount(WidgetDatePicker);
    const parsed = wrapper.vm.parseInputToModel("2024-05-02 13:45", "datetime");
    expect(parsed).toBeInstanceOf(Date);
    expect(DateTime.fromJSDate(parsed).toISO()).toContain("2024-05-02T13:45");
    expect(() => wrapper.vm.parseInputToModel("bad", "date")).toThrow("Invalid input format");
});

scopedIt("computes selection mode from value", async () => {
    const wrapper = mount(WidgetDatePicker, { props: { modelValue: [null, null] } });
    expect(wrapper.vm.computedSelectionMode).toBe("range");
    await wrapper.setProps({ selectionMode: "single" });
    expect(wrapper.vm.computedSelectionMode).toBe("single");
});

scopedIt("updates value from manual input", async () => {
    vi.useFakeTimers();
    const wrapper = mount(WidgetDatePicker);
    wrapper.vm.onInput({ target: { value: "2024-05-06" } });
    expect(wrapper.vm.inputIsDirty).toBe(true);
    expect(wrapper.vm.unvalidatedInput).toBe("2024-05-06");
    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.inputIsDirty).toBe(false);
    expect(wrapper.vm.unvalidatedInput).toBe(null);
    expect(wrapper.vm.widgetContext.state.combinedValue).toBe("2024-05-06");
});

scopedIt("provides min and max dates", () => {
    const wrapper = mount(WidgetDatePicker, { props: { minDate: "2024-05-01", maxDate: "2024-05-05" } });
    expect(wrapper.vm.minDateAsDate.toISOString()).toBe("2024-05-01T00:00:00.000Z");
    expect(wrapper.vm.maxDateAsDate.toISOString()).toBe("2024-05-05T00:00:00.000Z");
});
