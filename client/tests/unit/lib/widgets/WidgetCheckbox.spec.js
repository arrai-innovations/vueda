import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-checkbox";
const QA_SEL = `[data-qa='${QA}']`;

const ControlCheckboxStub = defineComponent({
    name: "ControlCheckboxStub",
    props: ["modelValue", "id", "disabled", "name"],
    emits: ["update:modelValue", "focus", "blur"],
    setup(props, { emit, attrs }) {
        return () =>
            h("button", {
                id: props.id,
                disabled: props.disabled,
                name: props.name,
                "data-value": String(props.modelValue),
                role: "checkbox",
                ...attrs,
                onFocus: () => emit("focus"),
                onBlur: () => emit("blur"),
                onClick: () => emit("update:modelValue", !props.modelValue),
            });
    },
});
vi.mock("@vueda/controls/checkbox/ControlCheckbox.vue", () => ({ default: ControlCheckboxStub }));

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

const importComponent = () => import("@vueda/widgets/WidgetCheckbox.vue");

describe("lib/widgets/WidgetCheckbox.vue", () => {
    let WidgetCheckbox;

    beforeEach(async () => {
        WidgetCheckbox = (await importComponent()).default;
        mockedUseWidget.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        scopedIt("renders a ControlCheckbox element", async () => {
            const wrapper = mount(WidgetCheckbox);
            expect(wrapper.get(QA_SEL).element.tagName).toBe("BUTTON");
        });

        scopedIt("sets data-qa attribute on the root control", async () => {
            const wrapper = mount(WidgetCheckbox);
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
        });
    });

    describe("Field context integration", () => {
        scopedIt("applies fieldId from field context to the control id", async () => {
            const fc = { state: reactive({ fieldId: "field-123" }) };
            const wrapper = mount(WidgetCheckbox, {
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBe("field-123");
        });

        scopedIt("renders without field context (id is undefined)", async () => {
            const wrapper = mount(WidgetCheckbox);
            expect(wrapper.get(QA_SEL).attributes("id")).toBeUndefined();
        });
    });

    describe("Widget state bindings", () => {
        scopedIt("binds v-model to widgetContext.state.combinedValue", async () => {
            const wrapper = mount(WidgetCheckbox);
            expect(wrapper.get(QA_SEL).attributes("data-value")).toBe("false");
            widgetContext.state.combinedValue = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("data-value")).toBe("true");
        });

        scopedIt("applies disabled state", async () => {
            const wrapper = mount(WidgetCheckbox);
            expect(wrapper.get(QA_SEL).attributes("disabled")).toBeUndefined();
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).element.disabled).toBe(true);
        });

        scopedIt("applies combinedName to name attribute", async () => {
            const wrapper = mount(WidgetCheckbox);
            expect(wrapper.get(QA_SEL).attributes("name")).toBe("test-name");
        });
    });

    describe("Accessibility attributes", () => {
        scopedIt("applies aria-invalid when validation fails", async () => {
            const wrapper = mount(WidgetCheckbox);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
            widgetContext.state.validationState.invalid = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBe("true");
        });

        scopedIt("does not render aria-invalid='false' when valid", async () => {
            const wrapper = mount(WidgetCheckbox);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies aria-required when required", async () => {
            const wrapper = mount(WidgetCheckbox);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
            widgetContext.state.required = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBe("true");
        });

        scopedIt("does not render aria-required='false' when not required", async () => {
            const wrapper = mount(WidgetCheckbox);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
        });
    });

    describe("Events", () => {
        scopedIt("calls widgetContext.blur on blur event", async () => {
            const wrapper = mount(WidgetCheckbox);
            await wrapper.get(QA_SEL).trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.focus on focus event", async () => {
            const wrapper = mount(WidgetCheckbox);
            await wrapper.get(QA_SEL).trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });
    });

    describe("Attribute passthrough", () => {
        scopedIt("passes through non-class attrs via v-bind=$attrs", async () => {
            const wrapper = mount(WidgetCheckbox, {
                attrs: { "aria-label": "checkbox field", "data-testid": "my-checkbox" },
            });
            const el = wrapper.get(QA_SEL);
            expect(el.attributes("aria-label")).toBe("checkbox field");
            expect(el.attributes("data-testid")).toBe("my-checkbox");
        });
    });

    describe("Null value translation", () => {
        scopedIt("translates null combinedValue to 'indeterminate' for the control", async () => {
            const wrapper = mount(WidgetCheckbox);
            widgetContext.state.combinedValue = null;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("data-value")).toBe("indeterminate");
        });

        scopedIt("translates 'indeterminate' from the control back to null on combinedValue", async () => {
            const wrapper = mount(WidgetCheckbox);
            const ctrl = wrapper.getComponent(ControlCheckboxStub);
            ctrl.vm.$emit("update:modelValue", "indeterminate");
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(widgetContext.state.combinedValue).toBeNull();
        });

        scopedIt("passes true/false values through without translation", async () => {
            const wrapper = mount(WidgetCheckbox);
            const { nextTick } = await vi.importActual("vue");

            widgetContext.state.combinedValue = true;
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("data-value")).toBe("true");

            widgetContext.state.combinedValue = false;
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("data-value")).toBe("false");
        });
    });
});
