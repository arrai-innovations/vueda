import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-text-input";
const QA_SEL = `[data-qa='${QA}']`;

const ControlInputStub = defineComponent({
    name: "ControlInputStub",
    props: ["modelValue", "id", "disabled", "name"],
    emits: ["update:modelValue", "focus", "blur"],
    setup(props, { emit, attrs }) {
        return () =>
            h("input", {
                id: props.id,
                disabled: props.disabled,
                name: props.name,
                value: props.modelValue,
                ...attrs,
                onFocus: () => emit("focus"),
                onBlur: () => emit("blur"),
                onInput: (e) => emit("update:modelValue", e.target.value),
            });
    },
});
vi.mock("@vueda/controls/input/Input.vue", () => ({ default: ControlInputStub }));

vi.mock("@vueda/use/useMaska.js", () => ({
    useMaska: vi.fn(() => ({
        masked: { value: "" },
        unmasked: { value: "" },
        completed: { value: false },
        destroy: vi.fn(),
    })),
}));

let widgetContext;
const mockedUseWidget = vi.fn(() => {
    widgetContext = {
        state: reactive({
            combinedValue: "",
            disabled: false,
            validationState: reactive({ invalid: false, warning: false }),
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

const importComponent = () => import("@vueda/widgets/WidgetTextInput.vue");

describe("lib/widgets/WidgetTextInput.vue", () => {
    let WidgetTextInput;

    beforeEach(async () => {
        WidgetTextInput = (await importComponent()).default;
        mockedUseWidget.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        scopedIt("renders a Input element", async () => {
            const wrapper = mount(WidgetTextInput);
            expect(wrapper.get(QA_SEL).element.tagName).toBe("INPUT");
        });

        scopedIt("sets data-qa attribute on the root control", async () => {
            const wrapper = mount(WidgetTextInput);
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
        });
    });

    describe("Field context integration", () => {
        scopedIt("applies fieldId from field context to the control id", async () => {
            const fc = { state: reactive({ fieldId: "field-123" }) };
            const wrapper = mount(WidgetTextInput, {
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBe("field-123");
        });

        scopedIt("renders without field context (id is undefined)", async () => {
            const wrapper = mount(WidgetTextInput);
            expect(wrapper.get(QA_SEL).attributes("id")).toBeUndefined();
        });
    });

    describe("Widget state bindings", () => {
        scopedIt("binds v-model to widgetContext.state.combinedValue", async () => {
            const wrapper = mount(WidgetTextInput);
            expect(wrapper.get(QA_SEL).attributes("value")).toBe("");
            widgetContext.state.combinedValue = "hello";
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("value")).toBe("hello");
        });

        scopedIt("applies disabled state", async () => {
            const wrapper = mount(WidgetTextInput);
            expect(wrapper.get(QA_SEL).attributes("disabled")).toBeUndefined();
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).element.disabled).toBe(true);
        });

        scopedIt("applies combinedName to name attribute", async () => {
            const wrapper = mount(WidgetTextInput);
            expect(wrapper.get(QA_SEL).attributes("name")).toBe("test-name");
        });
    });

    describe("Accessibility attributes", () => {
        scopedIt("applies aria-invalid when validation fails", async () => {
            const wrapper = mount(WidgetTextInput);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
            widgetContext.state.validationState.invalid = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBe("true");
        });

        scopedIt("does not render aria-invalid='false' when valid", async () => {
            const wrapper = mount(WidgetTextInput);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies data-warning when the field carries a warning", async () => {
            const wrapper = mount(WidgetTextInput);
            expect(wrapper.get(QA_SEL).attributes("data-warning")).toBeUndefined();
            widgetContext.state.validationState.warning = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("data-warning")).toBe("true");
            // Warning is non-blocking, so it must not claim the invalid state too.
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies aria-required when required", async () => {
            const wrapper = mount(WidgetTextInput);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
            widgetContext.state.required = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBe("true");
        });

        scopedIt("does not render aria-required='false' when not required", async () => {
            const wrapper = mount(WidgetTextInput);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
        });
    });

    describe("Events", () => {
        scopedIt("calls widgetContext.blur on blur event", async () => {
            const wrapper = mount(WidgetTextInput);
            await wrapper.get(QA_SEL).trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.focus on focus event", async () => {
            const wrapper = mount(WidgetTextInput);
            await wrapper.get(QA_SEL).trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });
    });

    describe("Attribute passthrough", () => {
        scopedIt("passes through non-class attrs via v-bind=$attrs", async () => {
            const wrapper = mount(WidgetTextInput, {
                attrs: { placeholder: "Enter text", "aria-label": "text field" },
            });
            const input = wrapper.get(QA_SEL);
            expect(input.attributes("placeholder")).toBe("Enter text");
            expect(input.attributes("aria-label")).toBe("text field");
        });
    });

    describe("Mask support", () => {
        scopedIt("calls useMaska with a computed options object containing the mask", async () => {
            const { useMaska } = await import("@vueda/use/useMaska.js");
            mount(WidgetTextInput, { props: { mask: "###-####" } });
            expect(useMaska).toHaveBeenCalledTimes(1);
            const [, optionsArg] = useMaska.mock.calls[0];
            expect(optionsArg.value).toEqual({ mask: "###-####" });
        });

        scopedIt("includes custom tokens in maska options when provided", async () => {
            const { useMaska } = await import("@vueda/use/useMaska.js");
            const tokens = { H: { pattern: /[0-9a-fA-F]/ } };
            mount(WidgetTextInput, { props: { mask: "HHHH-HHHH", tokens } });
            expect(useMaska).toHaveBeenCalledTimes(1);
            const [, optionsArg] = useMaska.mock.calls[0];
            expect(optionsArg.value).toEqual({ mask: "HHHH-HHHH", tokens });
        });

        scopedIt("tears down and re-creates maska scope when mask changes", async () => {
            const { useMaska } = await import("@vueda/use/useMaska.js");
            const wrapper = mount(WidgetTextInput, { props: { mask: "###-####" } });
            expect(useMaska).toHaveBeenCalledTimes(1);

            await wrapper.setProps({ mask: undefined });
            await wrapper.setProps({ mask: "####" });
            expect(useMaska).toHaveBeenCalledTimes(2);
        });
    });
});
