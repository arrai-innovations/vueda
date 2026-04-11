import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-radio-group";
const QA_SEL = `[data-qa='${QA}']`;
const QA_OPTION_SEL = `[data-qa='widget-radio-group-option']`;
const QA_LABEL_SEL = `[data-qa='widget-radio-group-label']`;

const TEST_OPTIONS = [
    { label: "Yes", value: "true" },
    { label: "No", value: "false" },
];

const ControlRadioGroupStub = defineComponent({
    name: "ControlRadioGroupStub",
    props: ["modelValue", "disabled", "name"],
    emits: ["update:modelValue"],
    setup(props, { slots, attrs }) {
        return () =>
            h(
                "div",
                {
                    role: "radiogroup",
                    ...attrs,
                },
                slots.default?.(),
            );
    },
});

const ControlRadioGroupItemStub = defineComponent({
    name: "ControlRadioGroupItemStub",
    props: ["value", "id"],
    emits: ["focus", "blur"],
    setup(props, { emit, attrs }) {
        return () =>
            h("button", {
                role: "radio",
                id: props.id,
                "data-value": props.value,
                ...attrs,
                onFocus: () => emit("focus"),
                onBlur: () => emit("blur"),
            });
    },
});

vi.mock("@vueda/controls/radio-group/ControlRadioGroup.vue", () => ({ default: ControlRadioGroupStub }));
vi.mock("@vueda/controls/radio-group/ControlRadioGroupItem.vue", () => ({ default: ControlRadioGroupItemStub }));

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

const importComponent = () => import("@vueda/widgets/WidgetRadioGroup.vue");

describe("lib/widgets/WidgetRadioGroup.vue", () => {
    let WidgetRadioGroup;

    beforeEach(async () => {
        WidgetRadioGroup = (await importComponent()).default;
        mockedUseWidget.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        scopedIt("renders a ControlRadioGroup element", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).element.tagName).toBe("DIV");
            expect(wrapper.get(QA_SEL).attributes("role")).toBe("radiogroup");
        });

        scopedIt("sets data-qa attribute on the root control", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
        });

        scopedIt("renders one option wrapper per option", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.findAll(QA_OPTION_SEL)).toHaveLength(2);
        });

        scopedIt("renders a radio item button for each option", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            const buttons = wrapper.findAll("[role='radio']");
            expect(buttons).toHaveLength(2);
            expect(buttons[0].attributes("data-value")).toBe("true");
            expect(buttons[1].attributes("data-value")).toBe("false");
        });

        scopedIt("renders labels with correct text", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            const labels = wrapper.findAll(QA_LABEL_SEL);
            expect(labels).toHaveLength(2);
            expect(labels[0].text()).toBe("Yes");
            expect(labels[1].text()).toBe("No");
        });
    });

    describe("Option mapping", () => {
        scopedIt("uses custom optionLabel and optionValue keys", async () => {
            const customOptions = [
                { text: "Alpha", code: "a" },
                { text: "Beta", code: "b" },
            ];
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: customOptions, optionLabel: "text", optionValue: "code" },
            });
            const labels = wrapper.findAll(QA_LABEL_SEL);
            expect(labels[0].text()).toBe("Alpha");
            expect(labels[1].text()).toBe("Beta");
            const buttons = wrapper.findAll("[role='radio']");
            expect(buttons[0].attributes("data-value")).toBe("a");
            expect(buttons[1].attributes("data-value")).toBe("b");
        });
    });

    describe("Field context integration", () => {
        scopedIt("applies fieldId to radio item ids", async () => {
            const fc = { state: reactive({ fieldId: "field-123" }) };
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            const buttons = wrapper.findAll("[role='radio']");
            expect(buttons[0].attributes("id")).toBe("field-123-true");
            expect(buttons[1].attributes("id")).toBe("field-123-false");
        });

        scopedIt("falls back to combinedName for ids when no field context", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            const buttons = wrapper.findAll("[role='radio']");
            expect(buttons[0].attributes("id")).toBe("test-name-true");
            expect(buttons[1].attributes("id")).toBe("test-name-false");
        });
    });

    describe("Widget state bindings", () => {
        scopedIt("passes disabled state to the radio group component", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            const group = wrapper.getComponent(ControlRadioGroupStub);
            expect(group.props("disabled")).toBe(false);
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(group.props("disabled")).toBe(true);
        });

        scopedIt("passes combinedName to the radio group component", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            const group = wrapper.getComponent(ControlRadioGroupStub);
            expect(group.props("name")).toBe("test-name");
        });
    });

    describe("Accessibility attributes", () => {
        scopedIt("applies aria-invalid when validation fails", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
            widgetContext.state.validationState.invalid = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBe("true");
        });

        scopedIt("does not render aria-invalid='false' when valid", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies aria-required when required", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
            widgetContext.state.required = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBe("true");
        });

        scopedIt("does not render aria-required='false' when not required", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
        });
    });

    describe("Events", () => {
        scopedIt("calls widgetContext.focus when a radio item receives focus", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            const buttons = wrapper.findAll("[role='radio']");
            await buttons[0].trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.blur when a radio item loses focus", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
            });
            const buttons = wrapper.findAll("[role='radio']");
            await buttons[0].trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });
    });

    describe("Attribute passthrough", () => {
        scopedIt("passes through non-class attrs via v-bind=$attrs", async () => {
            const wrapper = mount(WidgetRadioGroup, {
                props: { options: TEST_OPTIONS },
                attrs: { "aria-label": "radio group" },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-label")).toBe("radio group");
        });
    });
});
