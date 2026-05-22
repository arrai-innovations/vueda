import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-native-select";
const QA_SEL = `[data-qa='${QA}']`;

const TEST_OPTIONS = [
    { label: "Red", value: "red" },
    { label: "Green", value: "green" },
    { label: "Blue", value: "blue" },
];

const ControlNativeSelectStub = defineComponent({
    name: "ControlNativeSelectStub",
    props: ["modelValue", "id", "disabled", "name"],
    emits: ["update:modelValue", "focus", "blur"],
    setup(props, { emit, attrs, slots }) {
        return () =>
            h(
                "select",
                {
                    id: props.id,
                    disabled: props.disabled,
                    name: props.name,
                    value: props.modelValue,
                    ...attrs,
                    onFocus: () => emit("focus"),
                    onBlur: () => emit("blur"),
                    onChange: (e) => emit("update:modelValue", e.target.value),
                },
                slots.default?.(),
            );
    },
});
vi.mock("@vueda/controls/native-select/NativeSelect.vue", () => ({ default: ControlNativeSelectStub }));

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

const importComponent = () => import("@vueda/widgets/WidgetNativeSelect.vue");

describe("lib/widgets/WidgetNativeSelect.vue", () => {
    let WidgetNativeSelect;

    beforeEach(async () => {
        WidgetNativeSelect = (await importComponent()).default;
        mockedUseWidget.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        scopedIt("renders a NativeSelect element", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).element.tagName).toBe("SELECT");
        });

        scopedIt("sets data-qa attribute on the root control", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
        });
    });

    describe("Field context integration", () => {
        scopedIt("applies fieldId from field context to the control id", async () => {
            const fc = { state: reactive({ fieldId: "field-123" }) };
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBe("field-123");
        });

        scopedIt("renders without field context (id is undefined)", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBeUndefined();
        });
    });

    describe("Widget state bindings", () => {
        scopedIt("binds v-model to widgetContext.state.combinedValue", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("value")).toBe("");
            widgetContext.state.combinedValue = "green";
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("value")).toBe("green");
        });

        scopedIt("applies disabled state", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("disabled")).toBeUndefined();
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).element.disabled).toBe(true);
        });

        scopedIt("applies combinedName to name attribute", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("name")).toBe("test-name");
        });
    });

    describe("Accessibility attributes", () => {
        scopedIt("applies aria-invalid when validation fails", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
            widgetContext.state.validationState.invalid = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBe("true");
        });

        scopedIt("does not render aria-invalid='false' when valid", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies aria-required when required", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
            widgetContext.state.required = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBe("true");
        });

        scopedIt("does not render aria-required='false' when not required", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
        });
    });

    describe("Events", () => {
        scopedIt("calls widgetContext.blur on blur event", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            await wrapper.get(QA_SEL).trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.focus on focus event", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            await wrapper.get(QA_SEL).trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });
    });

    describe("Attribute passthrough", () => {
        scopedIt("passes through non-class attrs via v-bind=$attrs", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
                attrs: { "aria-label": "color picker" },
            });
            expect(wrapper.get(QA_SEL).attributes("aria-label")).toBe("color picker");
        });
    });

    describe("Options rendering", () => {
        scopedIt("renders option elements from options prop", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            const options = wrapper.findAll("option");
            expect(options).toHaveLength(3);
            expect(options[0].text()).toBe("Red");
            expect(options[1].text()).toBe("Green");
            expect(options[2].text()).toBe("Blue");
        });

        scopedIt("sets value attribute on each option", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            const options = wrapper.findAll("option");
            expect(options[0].attributes("value")).toBe("red");
            expect(options[1].attributes("value")).toBe("green");
            expect(options[2].attributes("value")).toBe("blue");
        });

        scopedIt("uses custom optionLabel and optionValue keys", async () => {
            const customOptions = [
                { text: "Alpha", code: "a" },
                { text: "Beta", code: "b" },
            ];
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: customOptions, optionLabel: "text", optionValue: "code" },
            });
            const options = wrapper.findAll("option");
            expect(options).toHaveLength(2);
            expect(options[0].text()).toBe("Alpha");
            expect(options[0].attributes("value")).toBe("a");
            expect(options[1].text()).toBe("Beta");
            expect(options[1].attributes("value")).toBe("b");
        });

        scopedIt("renders placeholder option when provided", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS, placeholder: "Choose a color" },
            });
            const options = wrapper.findAll("option");
            expect(options).toHaveLength(4);
            expect(options[0].text()).toBe("Choose a color");
            expect(options[0].attributes("value")).toBe("");
            expect(options[0].attributes("disabled")).toBeDefined();
        });

        scopedIt("does not render placeholder option when not provided", async () => {
            const wrapper = mount(WidgetNativeSelect, {
                props: { options: TEST_OPTIONS },
            });
            const options = wrapper.findAll("option");
            expect(options).toHaveLength(3);
        });
    });
});
