import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

/* ------------------------------------------------------------------ */
/*  Stubs for the NumberField family                           */
/* ------------------------------------------------------------------ */

const ControlNumberFieldStub = defineComponent({
    name: "ControlNumberFieldStub",
    props: ["modelValue", "disabled", "min", "max"],
    emits: ["update:modelValue"],
    setup(props, { slots, emit }) {
        return () => h("div", { "data-stub": "number-field" }, slots.default?.());
    },
});

const ControlNumberFieldContentStub = defineComponent({
    name: "ControlNumberFieldContentStub",
    setup(_props, { slots }) {
        return () => h("div", { "data-stub": "number-field-content" }, slots.default?.());
    },
});

const ControlNumberFieldInputStub = defineComponent({
    name: "ControlNumberFieldInputStub",
    setup(_props, { attrs }) {
        return () =>
            h("input", {
                type: "text",
                "data-stub": "number-input",
                "aria-label": attrs["aria-label"],
                "data-qa": attrs["data-qa"],
            });
    },
});

const ControlNumberFieldIncrementStub = defineComponent({
    name: "ControlNumberFieldIncrementStub",
    setup() {
        return () => h("button", { "data-stub": "increment" }, "+");
    },
});

const ControlNumberFieldDecrementStub = defineComponent({
    name: "ControlNumberFieldDecrementStub",
    setup() {
        return () => h("button", { "data-stub": "decrement" }, "-");
    },
});

vi.mock("@vueda/controls/number-field/NumberField.vue", () => ({ default: ControlNumberFieldStub }));
vi.mock("@vueda/controls/number-field/NumberFieldContent.vue", () => ({
    default: ControlNumberFieldContentStub,
}));
vi.mock("@vueda/controls/number-field/NumberFieldInput.vue", () => ({ default: ControlNumberFieldInputStub }));
vi.mock("@vueda/controls/number-field/NumberFieldIncrement.vue", () => ({
    default: ControlNumberFieldIncrementStub,
}));
vi.mock("@vueda/controls/number-field/NumberFieldDecrement.vue", () => ({
    default: ControlNumberFieldDecrementStub,
}));

vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: () => () => "" }));

let WidgetDuration;

const fieldContext = {
    state: reactive({
        fieldId: "test-field-id",
        dependencyValues: {},
        value: undefined,
        required: false,
        errors: {},
        name: "duration",
    }),
    registerDependencyValues: vi.fn(),
    unregisterDependencyValues: vi.fn(),
    setTouched: vi.fn(),
    clearTouched: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
};
const mountOptions = {
    global: {
        provide: {
            [FieldContextSymbol]: fieldContext,
        },
    },
};

beforeEach(async () => {
    WidgetDuration = (await import("@vueda/widgets/WidgetDuration.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

/**
 * Mount the widget with `value` as both the field value and the model value.
 *
 * @param {any} value
 * @param {object} [props]
 */
const mountWithValue = (value, props = {}) => {
    fieldContext.state.value = value;
    return mount(WidgetDuration, { props: { modelValue: value, ...props }, ...mountOptions });
};

/**
 * @param {import('@vue/test-utils').VueWrapper} wrapper
 * @returns {any[]} The model value each spinner shows, in rendered order.
 */
const shownValues = (wrapper) =>
    wrapper.findAllComponents(ControlNumberFieldStub).map((field) => field.props("modelValue"));

describe("lib/widgets/WidgetDuration.vue", () => {
    describe("Rendering", () => {
        scopedIt("renders minutes input by default", () => {
            const wrapper = mountWithValue("00:01:00");
            const numberFields = wrapper.findAllComponents(ControlNumberFieldStub);
            expect(numberFields.length).toBe(1);
            expect(wrapper.find("[data-qa='duration-minutes']").exists()).toBe(true);
            expect(wrapper.find("[data-qa='duration-hours']").exists()).toBe(false);
            expect(wrapper.find("[data-qa='duration-days']").exists()).toBe(false);
        });

        scopedIt("renders multiple time units when enabled", () => {
            const wrapper = mountWithValue("1 02:03:00", { showDays: true, showHours: true });
            expect(wrapper.find("[data-qa='duration-days']").exists()).toBe(true);
            expect(wrapper.find("[data-qa='duration-hours']").exists()).toBe(true);
            expect(wrapper.find("[data-qa='duration-minutes']").exists()).toBe(true);
            expect(wrapper.find("[data-qa='duration-seconds']").exists()).toBe(false);
        });
    });

    describe("Reading the value", () => {
        scopedIt("splits a duration string across the shown units", () => {
            const wrapper = mountWithValue("1 02:03:00", { showDays: true, showHours: true });
            expect(shownValues(wrapper)).toEqual([1, 2, 3]);
        });

        scopedIt("folds a hidden larger unit into the largest shown unit", () => {
            const wrapper = mountWithValue("2 01:30:00", { showHours: true });
            expect(shownValues(wrapper)).toEqual([49, 30]);
        });

        scopedIt("reads a number of seconds in seconds mode", () => {
            const wrapper = mountWithValue(5400, { seconds: true, showHours: true });
            expect(shownValues(wrapper)).toEqual([1, 30]);
        });

        scopedIt("shows the size of a negative duration after a negative sign", () => {
            const wrapper = mountWithValue("-1 23:00:00", { showHours: true });
            expect(shownValues(wrapper)).toEqual([1, 0]);
            expect(wrapper.find("[data-qa='duration-sign']").text()).toBe("Negative−");
        });

        scopedIt("shows no sign for a positive duration", () => {
            const wrapper = mountWithValue("01:00:00", { showHours: true });
            expect(wrapper.find("[data-qa='duration-sign']").exists()).toBe(false);
        });

        scopedIt("shows empty spinners for an empty value", () => {
            const wrapper = mountWithValue(null, { showHours: true });
            expect(shownValues(wrapper)).toEqual([undefined, undefined]);
        });
    });

    describe("Updating the value", () => {
        scopedIt("writes a duration string when a unit value changes", () => {
            const wrapper = mountWithValue("1 02:03:00", { showDays: true, showHours: true });
            // Order: days (0), hours (1), minutes (2)
            wrapper.findAllComponents(ControlNumberFieldStub)[1].vm.$emit("update:modelValue", 5);
            expect(fieldContext.state.value).toBe("1 05:03:00");
        });

        scopedIt("writes a duration string from an empty value", () => {
            const wrapper = mountWithValue(null, { showHours: true });
            wrapper.findAllComponents(ControlNumberFieldStub)[1].vm.$emit("update:modelValue", 90);
            expect(fieldContext.state.value).toBe("01:30:00");
        });

        scopedIt("keeps the part of the value below the smallest shown unit", () => {
            const wrapper = mountWithValue("00:10:30");
            wrapper.getComponent(ControlNumberFieldStub).vm.$emit("update:modelValue", 20);
            expect(fieldContext.state.value).toBe("00:20:30");
        });

        scopedIt("keeps a negative duration negative when a unit changes", () => {
            const wrapper = mountWithValue("-1 23:00:00", { showHours: true });
            wrapper.findAllComponents(ControlNumberFieldStub)[0].vm.$emit("update:modelValue", 2);
            expect(fieldContext.state.value).toBe("-1 22:00:00");
        });

        scopedIt("writes a number of seconds in seconds mode", () => {
            const wrapper = mountWithValue(60, { seconds: true });
            wrapper.getComponent(ControlNumberFieldStub).vm.$emit("update:modelValue", 3);
            expect(fieldContext.state.value).toBe(180);
        });

        scopedIt("writes null when a unit is cleared and the rest of the value is zero", () => {
            const wrapper = mountWithValue("00:05:00", { showHours: true });
            const [hours, minutes] = wrapper.findAllComponents(ControlNumberFieldStub);
            hours.vm.$emit("update:modelValue", undefined);
            expect(fieldContext.state.value).toBe("00:05:00");
            minutes.vm.$emit("update:modelValue", undefined);
            expect(fieldContext.state.value).toBeNull();
        });

        scopedIt("keeps a zero duration entered as 0", () => {
            const wrapper = mountWithValue(null, { showHours: true });
            wrapper.findAllComponents(ControlNumberFieldStub)[1].vm.$emit("update:modelValue", 0);
            expect(fieldContext.state.value).toBe("00:00:00");
        });
    });
});
