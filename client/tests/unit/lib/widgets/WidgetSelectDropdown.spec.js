import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-select-dropdown";
const QA_SEL = `[data-qa='${QA}']`;

const TEST_OPTIONS = [
    { label: "Red", value: "red" },
    { label: "Green", value: "green" },
    { label: "Blue", value: "blue" },
];

/* ------------------------------------------------------------------ */
/*  Stubs for the ControlSelect family                                 */
/* ------------------------------------------------------------------ */

const ControlSelectStub = defineComponent({
    name: "ControlSelectStub",
    props: ["modelValue", "disabled", "name"],
    emits: ["update:modelValue"],
    setup(props, { slots, attrs }) {
        return () => h("div", { "data-stub": "select", ...attrs }, slots.default?.());
    },
});

const ControlSelectTriggerStub = defineComponent({
    name: "ControlSelectTriggerStub",
    props: ["id"],
    emits: ["focus", "blur"],
    setup(props, { emit, attrs, slots }) {
        return () =>
            h(
                "button",
                {
                    id: props.id,
                    ...attrs,
                    onFocus: () => emit("focus"),
                    onBlur: () => emit("blur"),
                },
                slots.default?.(),
            );
    },
});

const ControlSelectValueStub = defineComponent({
    name: "ControlSelectValueStub",
    props: ["placeholder"],
    setup(props) {
        return () => h("span", { "data-stub": "select-value" }, props.placeholder);
    },
});

const ControlSelectContentStub = defineComponent({
    name: "ControlSelectContentStub",
    setup(_props, { slots }) {
        return () => h("div", { "data-stub": "select-content" }, slots.default?.());
    },
});

const ControlSelectItemStub = defineComponent({
    name: "ControlSelectItemStub",
    props: ["value"],
    setup(props, { slots, attrs }) {
        return () => h("div", { "data-stub": "select-item", "data-value": props.value, ...attrs }, slots.default?.());
    },
});

vi.mock("@vueda/controls/select/ControlSelect.vue", () => ({ default: ControlSelectStub }));
vi.mock("@vueda/controls/select/ControlSelectTrigger.vue", () => ({ default: ControlSelectTriggerStub }));
vi.mock("@vueda/controls/select/ControlSelectValue.vue", () => ({ default: ControlSelectValueStub }));
vi.mock("@vueda/controls/select/ControlSelectContent.vue", () => ({ default: ControlSelectContentStub }));
vi.mock("@vueda/controls/select/ControlSelectItem.vue", () => ({ default: ControlSelectItemStub }));

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

const importComponent = () => import("@vueda/widgets/WidgetSelectDropdown.vue");

describe("lib/widgets/WidgetSelectDropdown.vue", () => {
    let WidgetSelectDropdown;

    beforeEach(async () => {
        WidgetSelectDropdown = (await importComponent()).default;
        mockedUseWidget.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        scopedIt("renders a trigger button with placeholder text", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS, placeholder: "Pick a color" },
            });
            const trigger = wrapper.get(QA_SEL);
            expect(trigger.element.tagName).toBe("BUTTON");
            expect(trigger.text()).toContain("Pick a color");
        });

        scopedIt("sets data-qa attribute on the trigger", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
        });
    });

    describe("Field context integration", () => {
        scopedIt("applies fieldId from field context to the trigger id", async () => {
            const fc = { state: reactive({ fieldId: "field-123" }) };
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBe("field-123");
        });

        scopedIt("renders without field context (id is undefined)", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBeUndefined();
        });
    });

    describe("Widget state bindings", () => {
        scopedIt("passes disabled state to the select root component", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            const root = wrapper.getComponent(ControlSelectStub);
            expect(root.props("disabled")).toBe(false);
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(root.props("disabled")).toBe(true);
        });

        scopedIt("passes combinedName to the select root component", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            const root = wrapper.getComponent(ControlSelectStub);
            expect(root.props("name")).toBe("test-name");
        });

        scopedIt("applies aria-invalid when validation fails", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
            widgetContext.state.validationState.invalid = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBe("true");
        });

        scopedIt("does not render aria-invalid='false' when valid", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies aria-required when required", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
            widgetContext.state.required = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBe("true");
        });

        scopedIt("does not render aria-required='false' when not required", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
        });
    });

    describe("Options rendering", () => {
        scopedIt("renders option items from options prop", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            const items = wrapper.findAll("[data-stub='select-item']");
            expect(items).toHaveLength(3);
            expect(items[0].text()).toBe("Red");
            expect(items[1].text()).toBe("Green");
            expect(items[2].text()).toBe("Blue");
        });

        scopedIt("sets value attribute on each option item", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            const items = wrapper.findAll("[data-stub='select-item']");
            expect(items[0].attributes("data-value")).toBe("red");
            expect(items[1].attributes("data-value")).toBe("green");
            expect(items[2].attributes("data-value")).toBe("blue");
        });
    });

    describe("Custom option keys", () => {
        scopedIt("uses custom optionLabel and optionValue keys", async () => {
            const customOptions = [
                { text: "Alpha", code: "a" },
                { text: "Beta", code: "b" },
            ];
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: customOptions, optionLabel: "text", optionValue: "code" },
            });
            const items = wrapper.findAll("[data-stub='select-item']");
            expect(items).toHaveLength(2);
            expect(items[0].text()).toBe("Alpha");
            expect(items[0].attributes("data-value")).toBe("a");
            expect(items[1].text()).toBe("Beta");
            expect(items[1].attributes("data-value")).toBe("b");
        });
    });

    describe("Value selection", () => {
        scopedIt("binds v-model to widgetContext.state.combinedValue", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            const root = wrapper.getComponent(ControlSelectStub);
            expect(root.props("modelValue")).toBe("");
            widgetContext.state.combinedValue = "green";
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(root.props("modelValue")).toBe("green");
        });
    });

    describe("Attribute passthrough", () => {
        scopedIt("passes through non-class attrs via v-bind=$attrs to the select root", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
                attrs: { "aria-label": "color picker" },
            });
            const root = wrapper.getComponent(ControlSelectStub);
            expect(root.attributes("aria-label")).toBe("color picker");
        });
    });

    describe("Events", () => {
        scopedIt("calls widgetContext.focus on trigger focus event", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            await wrapper.get(QA_SEL).trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.blur on trigger blur event", async () => {
            const wrapper = mount(WidgetSelectDropdown, {
                props: { options: TEST_OPTIONS },
            });
            await wrapper.get(QA_SEL).trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });
    });
});
