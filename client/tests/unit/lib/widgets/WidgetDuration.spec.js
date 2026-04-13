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

describe("lib/widgets/WidgetDuration.vue", () => {
    scopedIt("renders minutes input by default", () => {
        fieldContext.state.value = { minutes: 1 };
        const wrapper = mount(WidgetDuration, { props: { modelValue: { minutes: 1 } }, ...mountOptions });
        const numberFields = wrapper.findAllComponents(ControlNumberFieldStub);
        expect(numberFields.length).toBe(1);
        expect(wrapper.find("[data-qa='duration-minutes']").exists()).toBe(true);
        expect(wrapper.find("[data-qa='duration-hours']").exists()).toBe(false);
        expect(wrapper.find("[data-qa='duration-days']").exists()).toBe(false);
    });

    scopedIt("renders multiple time units when enabled", () => {
        fieldContext.state.value = { days: 1, hours: 2, minutes: 3 };
        const wrapper = mount(WidgetDuration, {
            props: {
                modelValue: { days: 1, hours: 2, minutes: 3 },
                showDays: true,
                showHours: true,
            },
            ...mountOptions,
        });
        expect(wrapper.find("[data-qa='duration-days']").exists()).toBe(true);
        expect(wrapper.find("[data-qa='duration-hours']").exists()).toBe(true);
        expect(wrapper.find("[data-qa='duration-minutes']").exists()).toBe(true);
        expect(wrapper.find("[data-qa='duration-seconds']").exists()).toBe(false);
    });

    scopedIt("emits duration updates when a unit value changes", async () => {
        fieldContext.state.value = { days: 1, hours: 2, minutes: 3 };
        const wrapper = mount(WidgetDuration, {
            props: {
                modelValue: { days: 1, hours: 2, minutes: 3 },
                showDays: true,
                showHours: true,
            },
            ...mountOptions,
        });
        // Simulate hours update via the second NumberField (hours)
        // Order: days (0), hours (1), minutes (2)
        const allFields = wrapper.findAllComponents(ControlNumberFieldStub);
        allFields[1].vm.$emit("update:modelValue", 5);
        expect(fieldContext.state.value).toEqual({ days: 1, hours: 5, minutes: 3, seconds: undefined });
    });
});
