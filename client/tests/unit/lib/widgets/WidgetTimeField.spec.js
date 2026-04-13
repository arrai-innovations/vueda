import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-time-field";
const QA_SEL = `[data-qa='${QA}']`;

const ControlTimeFieldStub = defineComponent({
    name: "ControlTimeFieldStub",
    props: ["modelValue", "id", "disabled", "name", "granularity"],
    emits: ["update:modelValue", "focus", "blur"],
    setup(props, { emit, attrs, slots }) {
        return () =>
            h(
                "div",
                {
                    id: props.id,
                    disabled: props.disabled || undefined,
                    name: props.name,
                    "data-granularity": props.granularity,
                    ...attrs,
                    onFocus: () => emit("focus"),
                    onBlur: () => emit("blur"),
                },
                slots.default
                    ? slots.default({
                          segments: [
                              { part: "hour", value: "12" },
                              { part: "literal", value: ":" },
                              { part: "minute", value: "00" },
                          ],
                      })
                    : undefined,
            );
    },
});

const ControlTimeFieldInputStub = defineComponent({
    name: "ControlTimeFieldInputStub",
    props: ["part"],
    setup(props, { attrs }) {
        return () => h("span", { "data-part": props.part, ...attrs });
    },
});

vi.mock("@vueda/controls/time-field/TimeField.vue", () => ({ default: ControlTimeFieldStub }));
vi.mock("@vueda/controls/time-field/TimeFieldInput.vue", () => ({ default: ControlTimeFieldInputStub }));

vi.mock("@internationalized/date", () => ({
    parseTime: vi.fn((str) => ({ toString: () => str, _raw: str })),
}));

let widgetContext;
const mockedUseWidget = vi.fn(() => {
    widgetContext = {
        state: reactive({
            combinedValue: null,
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

const importComponent = () => import("@vueda/widgets/WidgetTimeField.vue");

describe("lib/widgets/WidgetTimeField.vue", () => {
    let WidgetTimeField;

    beforeEach(async () => {
        WidgetTimeField = (await importComponent()).default;
        mockedUseWidget.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        scopedIt("renders a TimeField element", async () => {
            const wrapper = mount(WidgetTimeField);
            expect(wrapper.get(QA_SEL).element.tagName).toBe("DIV");
        });

        scopedIt("sets data-qa attribute on the root control", async () => {
            const wrapper = mount(WidgetTimeField);
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
        });
    });

    describe("Field context integration", () => {
        scopedIt("applies fieldId from field context to the control id", async () => {
            const fc = { state: reactive({ fieldId: "field-789" }) };
            const wrapper = mount(WidgetTimeField, {
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBe("field-789");
        });

        scopedIt("renders without field context (id is undefined)", async () => {
            const wrapper = mount(WidgetTimeField);
            expect(wrapper.get(QA_SEL).attributes("id")).toBeUndefined();
        });
    });

    describe("Widget state bindings", () => {
        scopedIt("applies disabled state", async () => {
            const wrapper = mount(WidgetTimeField);
            expect(wrapper.get(QA_SEL).attributes("disabled")).toBeUndefined();
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("disabled")).toBe("true");
        });

        scopedIt("applies combinedName to name attribute", async () => {
            const wrapper = mount(WidgetTimeField);
            expect(wrapper.get(QA_SEL).attributes("name")).toBe("test-name");
        });
    });

    describe("Accessibility attributes", () => {
        scopedIt("applies aria-invalid when validation fails", async () => {
            const wrapper = mount(WidgetTimeField);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
            widgetContext.state.validationState.invalid = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBe("true");
        });

        scopedIt("does not render aria-invalid='false' when valid", async () => {
            const wrapper = mount(WidgetTimeField);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies aria-required when required", async () => {
            const wrapper = mount(WidgetTimeField);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
            widgetContext.state.required = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBe("true");
        });

        scopedIt("does not render aria-required='false' when not required", async () => {
            const wrapper = mount(WidgetTimeField);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
        });
    });

    describe("Events", () => {
        scopedIt("calls widgetContext.blur on blur event", async () => {
            const wrapper = mount(WidgetTimeField);
            await wrapper.get(QA_SEL).trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.focus on focus event", async () => {
            const wrapper = mount(WidgetTimeField);
            await wrapper.get(QA_SEL).trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });
    });

    describe("Value conversion", () => {
        scopedIt("converts ISO time string to timeValue on the control", async () => {
            const { parseTime } = await import("@internationalized/date");
            mount(WidgetTimeField);
            widgetContext.state.combinedValue = "14:30:00";
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(parseTime).toHaveBeenCalledWith("14:30:00");
        });

        scopedIt("converts null combinedValue to undefined timeValue", async () => {
            const wrapper = mount(WidgetTimeField);
            widgetContext.state.combinedValue = null;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("modelvalue")).toBeUndefined();
        });

        scopedIt("converts empty string combinedValue to undefined timeValue", async () => {
            const wrapper = mount(WidgetTimeField);
            widgetContext.state.combinedValue = "";
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("modelvalue")).toBeUndefined();
        });

        scopedIt("setting timeValue updates combinedValue via toString", async () => {
            const wrapper = mount(WidgetTimeField);
            const ctrl = wrapper.getComponent(ControlTimeFieldStub);
            const newTime = { toString: () => "09:15:00" };
            ctrl.vm.$emit("update:modelValue", newTime);
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(widgetContext.state.combinedValue).toBe("09:15:00");
        });
    });

    describe("Attribute passthrough", () => {
        scopedIt("passes through non-class attrs via v-bind=$attrs", async () => {
            const wrapper = mount(WidgetTimeField, {
                attrs: { "aria-label": "time field", "data-testid": "my-time" },
            });
            const el = wrapper.get(QA_SEL);
            expect(el.attributes("aria-label")).toBe("time field");
            expect(el.attributes("data-testid")).toBe("my-time");
        });
    });
});
