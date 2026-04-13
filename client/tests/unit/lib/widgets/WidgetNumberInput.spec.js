import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-number-input";
const QA_SEL = `[data-qa='${QA}']`;

/* ------------------------------------------------------------------ */
/*  Stubs for the NumberField family                           */
/* ------------------------------------------------------------------ */

const ControlNumberFieldStub = defineComponent({
    name: "ControlNumberFieldStub",
    props: ["modelValue", "disabled", "name", "min", "max", "step"],
    emits: ["update:modelValue"],
    setup(props, { slots, attrs }) {
        return () => h("div", { "data-stub": "number-field", ...attrs }, slots.default?.());
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
    props: ["id"],
    emits: ["focus", "blur"],
    setup(props, { emit, attrs }) {
        return () =>
            h("input", {
                id: props.id,
                type: "text",
                role: "spinbutton",
                ...attrs,
                onFocus: () => emit("focus"),
                onBlur: () => emit("blur"),
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

/* ------------------------------------------------------------------ */
/*  Stubs for the InputGroup family                            */
/* ------------------------------------------------------------------ */

const ControlInputGroupStub = defineComponent({
    name: "ControlInputGroupStub",
    setup(_props, { slots }) {
        return () => h("div", { "data-stub": "input-group" }, slots.default?.());
    },
});

const ControlInputGroupAddonStub = defineComponent({
    name: "ControlInputGroupAddonStub",
    props: ["align"],
    setup(props, { slots }) {
        return () => h("div", { "data-stub": "input-group-addon", "data-align": props.align }, slots.default?.());
    },
});

vi.mock("@vueda/controls/input-group/InputGroup.vue", () => ({ default: ControlInputGroupStub }));
vi.mock("@vueda/controls/input-group/InputGroupAddon.vue", () => ({ default: ControlInputGroupAddonStub }));

/* ------------------------------------------------------------------ */
/*  Mock useWidget                                                    */
/* ------------------------------------------------------------------ */

let widgetContext;
const mockedUseWidget = vi.fn(() => {
    widgetContext = {
        state: reactive({
            combinedValue: "",
            disabled: false,
            validationState: reactive({ invalid: false }),
            combinedName: "test-name",
            required: false,
        }),
        blur: vi.fn(),
        focus: vi.fn(),
    };
    return widgetContext;
});
vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_EMITS: ["update:modelValue"],
    WIDGET_PROPS: {},
    useWidget: mockedUseWidget,
}));

const importComponent = () => import("@vueda/widgets/WidgetNumberInput.vue");

describe("lib/widgets/WidgetNumberInput.vue", () => {
    let WidgetNumberInput;

    beforeEach(async () => {
        WidgetNumberInput = (await importComponent()).default;
        mockedUseWidget.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        scopedIt("renders number field with input and increment/decrement buttons", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            expect(wrapper.find("[data-stub='number-field']").exists()).toBe(true);
            expect(wrapper.find(QA_SEL).exists()).toBe(true);
            expect(wrapper.find("[data-stub='increment']").exists()).toBe(true);
            expect(wrapper.find("[data-stub='decrement']").exists()).toBe(true);
        });

        scopedIt("sets data-qa attribute on the input", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
        });
    });

    describe("Field context integration", () => {
        scopedIt("applies fieldId from field context to the input id", async () => {
            const fc = { state: reactive({ fieldId: "field-123" }) };
            const wrapper = mount(WidgetNumberInput, {
                props: {},
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBe("field-123");
        });

        scopedIt("renders without field context (id is undefined)", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            expect(wrapper.get(QA_SEL).attributes("id")).toBeUndefined();
        });
    });

    describe("Widget state bindings", () => {
        scopedIt("passes disabled state to the number field root", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            const root = wrapper.getComponent(ControlNumberFieldStub);
            expect(root.props("disabled")).toBe(false);
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(root.props("disabled")).toBe(true);
        });

        scopedIt("passes combinedName to the number field root", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            const root = wrapper.getComponent(ControlNumberFieldStub);
            expect(root.props("name")).toBe("test-name");
        });

        scopedIt("applies aria-invalid when validation fails", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
            widgetContext.state.validationState.invalid = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBe("true");
        });

        scopedIt("does not render aria-invalid='false' when valid", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies aria-required when required", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
            widgetContext.state.required = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBe("true");
        });

        scopedIt("does not render aria-required='false' when not required", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
        });
    });

    describe("String-to-number conversion", () => {
        scopedIt("converts string '42' to numeric 42 for the control", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            widgetContext.state.combinedValue = "42";
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            const root = wrapper.getComponent(ControlNumberFieldStub);
            expect(root.props("modelValue")).toBe(42);
        });

        scopedIt("converts null combinedValue to undefined for the control", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            widgetContext.state.combinedValue = null;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            const root = wrapper.getComponent(ControlNumberFieldStub);
            expect(root.props("modelValue")).toBeUndefined();
        });

        scopedIt("converts empty string combinedValue to undefined for the control", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            widgetContext.state.combinedValue = "";
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            const root = wrapper.getComponent(ControlNumberFieldStub);
            expect(root.props("modelValue")).toBeUndefined();
        });

        scopedIt("converts non-numeric string to undefined for the control", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            widgetContext.state.combinedValue = "abc";
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            const root = wrapper.getComponent(ControlNumberFieldStub);
            expect(root.props("modelValue")).toBeUndefined();
        });
    });

    describe("Number-to-string conversion", () => {
        scopedIt("converts numeric value from control to string for the field", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            const root = wrapper.getComponent(ControlNumberFieldStub);
            root.vm.$emit("update:modelValue", 99);
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(widgetContext.state.combinedValue).toBe("99");
        });

        scopedIt("converts null from control to null for the field", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            widgetContext.state.combinedValue = "50";
            const root = wrapper.getComponent(ControlNumberFieldStub);
            root.vm.$emit("update:modelValue", null);
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(widgetContext.state.combinedValue).toBeNull();
        });

        scopedIt("converts undefined from control to null for the field", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            widgetContext.state.combinedValue = "50";
            const root = wrapper.getComponent(ControlNumberFieldStub);
            root.vm.$emit("update:modelValue", undefined);
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(widgetContext.state.combinedValue).toBeNull();
        });
    });

    describe("Min/max/step props", () => {
        scopedIt("passes min prop to the number field root", async () => {
            const wrapper = mount(WidgetNumberInput, { props: { min: 0 } });
            const root = wrapper.getComponent(ControlNumberFieldStub);
            expect(root.props("min")).toBe(0);
        });

        scopedIt("passes max prop to the number field root", async () => {
            const wrapper = mount(WidgetNumberInput, { props: { max: 100 } });
            const root = wrapper.getComponent(ControlNumberFieldStub);
            expect(root.props("max")).toBe(100);
        });

        scopedIt("passes step prop to the number field root", async () => {
            const wrapper = mount(WidgetNumberInput, { props: { step: 5 } });
            const root = wrapper.getComponent(ControlNumberFieldStub);
            expect(root.props("step")).toBe(5);
        });
    });

    describe("Unit label", () => {
        scopedIt("renders InputGroup with addon when unit prop is provided", async () => {
            const wrapper = mount(WidgetNumberInput, { props: { unit: "kg" } });
            expect(wrapper.find("[data-stub='input-group']").exists()).toBe(true);
            const addon = wrapper.find("[data-stub='input-group-addon']");
            expect(addon.exists()).toBe(true);
            expect(addon.attributes("data-align")).toBe("inline-end");
            expect(addon.text()).toContain("kg");
        });

        scopedIt("still renders input and buttons inside the input group", async () => {
            const wrapper = mount(WidgetNumberInput, { props: { unit: "CAD" } });
            expect(wrapper.find("[data-stub='input-group'] [data-stub='number-field-content']").exists()).toBe(true);
            expect(wrapper.find(QA_SEL).exists()).toBe(true);
            expect(wrapper.find("[data-stub='increment']").exists()).toBe(true);
            expect(wrapper.find("[data-stub='decrement']").exists()).toBe(true);
        });
    });

    describe("No unit", () => {
        scopedIt("does not render InputGroup when unit prop is not provided", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            expect(wrapper.find("[data-stub='input-group']").exists()).toBe(false);
            expect(wrapper.find("[data-stub='input-group-addon']").exists()).toBe(false);
        });

        scopedIt("renders content directly without input group wrapper", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            expect(wrapper.find("[data-stub='number-field-content']").exists()).toBe(true);
            expect(wrapper.find(QA_SEL).exists()).toBe(true);
        });
    });

    describe("Events", () => {
        scopedIt("calls widgetContext.focus on input focus event", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            await wrapper.get(QA_SEL).trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.blur on input blur event", async () => {
            const wrapper = mount(WidgetNumberInput, { props: {} });
            await wrapper.get(QA_SEL).trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });
    });

    describe("Attribute passthrough", () => {
        scopedIt("passes through extra attrs to the number field root", async () => {
            const wrapper = mount(WidgetNumberInput, {
                props: {},
                attrs: { "aria-label": "quantity" },
            });
            const root = wrapper.getComponent(ControlNumberFieldStub);
            expect(root.attributes("aria-label")).toBe("quantity");
        });
    });
});
