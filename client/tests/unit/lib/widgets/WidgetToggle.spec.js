import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-toggle";
const QA_SEL = `[data-qa='${QA}']`;

const ControlSwitchStub = defineComponent({
    name: "ControlSwitchStub",
    props: ["modelValue", "id", "disabled", "name"],
    emits: ["update:modelValue", "focus", "blur"],
    setup(props, { emit, attrs }) {
        return () =>
            h("button", {
                id: props.id,
                disabled: props.disabled,
                name: props.name,
                role: "switch",
                "aria-checked": String(!!props.modelValue),
                ...attrs,
                onFocus: () => emit("focus"),
                onBlur: () => emit("blur"),
                onClick: () => emit("update:modelValue", !props.modelValue),
            });
    },
});
vi.mock("@vueda/controls/switch/ControlSwitch.vue", () => ({ default: ControlSwitchStub }));

let widgetContext;
const mockedUseWidget = vi.fn(() => {
    widgetContext = {
        state: reactive({
            combinedValue: false,
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

const importComponent = () => import("@vueda/widgets/WidgetToggle.vue");

describe("lib/widgets/WidgetToggle.vue", () => {
    let WidgetToggle;

    beforeEach(async () => {
        WidgetToggle = (await importComponent()).default;
        mockedUseWidget.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        scopedIt("renders a ControlSwitch element", async () => {
            const wrapper = mount(WidgetToggle);
            expect(wrapper.get(QA_SEL).element.tagName).toBe("BUTTON");
        });

        scopedIt("sets data-qa attribute on the root control", async () => {
            const wrapper = mount(WidgetToggle);
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
        });
    });

    describe("Field context integration", () => {
        scopedIt("applies fieldId from field context to the control id", async () => {
            const fc = { state: reactive({ fieldId: "field-123" }) };
            const wrapper = mount(WidgetToggle, {
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBe("field-123");
        });

        scopedIt("renders without field context (id is undefined)", async () => {
            const wrapper = mount(WidgetToggle);
            expect(wrapper.get(QA_SEL).attributes("id")).toBeUndefined();
        });
    });

    describe("Widget state bindings", () => {
        scopedIt("binds v-model to widgetContext.state.combinedValue", async () => {
            const wrapper = mount(WidgetToggle);
            expect(wrapper.get(QA_SEL).attributes("aria-checked")).toBe("false");
            widgetContext.state.combinedValue = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-checked")).toBe("true");
        });

        scopedIt("applies disabled state", async () => {
            const wrapper = mount(WidgetToggle);
            expect(wrapper.get(QA_SEL).attributes("disabled")).toBeUndefined();
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).element.disabled).toBe(true);
        });

        scopedIt("applies combinedName to name attribute", async () => {
            const wrapper = mount(WidgetToggle);
            expect(wrapper.get(QA_SEL).attributes("name")).toBe("test-name");
        });
    });

    describe("Accessibility attributes", () => {
        scopedIt("applies aria-invalid when validation fails", async () => {
            const wrapper = mount(WidgetToggle);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
            widgetContext.state.validationState.invalid = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBe("true");
        });

        scopedIt("does not render aria-invalid='false' when valid", async () => {
            const wrapper = mount(WidgetToggle);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies aria-required when required", async () => {
            const wrapper = mount(WidgetToggle);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
            widgetContext.state.required = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBe("true");
        });

        scopedIt("does not render aria-required='false' when not required", async () => {
            const wrapper = mount(WidgetToggle);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
        });
    });

    describe("Events", () => {
        scopedIt("calls widgetContext.blur on blur event", async () => {
            const wrapper = mount(WidgetToggle);
            await wrapper.get(QA_SEL).trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.focus on focus event", async () => {
            const wrapper = mount(WidgetToggle);
            await wrapper.get(QA_SEL).trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });
    });

    describe("Attribute passthrough", () => {
        scopedIt("passes through non-class attrs via v-bind=$attrs", async () => {
            const wrapper = mount(WidgetToggle, {
                attrs: { "aria-label": "toggle field", "data-testid": "my-toggle" },
            });
            const el = wrapper.get(QA_SEL);
            expect(el.attributes("aria-label")).toBe("toggle field");
            expect(el.attributes("data-testid")).toBe("my-toggle");
        });
    });
});
