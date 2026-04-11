import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-date-range-field";
const QA_SEL = `[data-qa='${QA}']`;
const QA_TRIGGER_SEL = `[data-qa='${QA}-trigger']`;

const ControlDateRangeFieldStub = defineComponent({
    name: "ControlDateRangeFieldStub",
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
                          segments: {
                              start: [{ part: "day", value: "1" }],
                              end: [{ part: "day", value: "2" }],
                          },
                      })
                    : undefined,
            );
    },
});

const ControlDateRangeFieldInputStub = defineComponent({
    name: "ControlDateRangeFieldInputStub",
    props: ["part", "type"],
    setup(props, { attrs }) {
        return () => h("span", { "data-part": props.part, "data-type": props.type, ...attrs });
    },
});

const ShellPopoverStub = defineComponent({
    name: "ShellPopoverStub",
    props: ["open"],
    emits: ["update:open"],
    setup(_, { slots }) {
        return () => h("div", {}, slots.default ? slots.default() : undefined);
    },
});

const ShellPopoverContentStub = defineComponent({
    name: "ShellPopoverContentStub",
    setup(_, { slots }) {
        return () => h("div", {}, slots.default ? slots.default() : undefined);
    },
});

const ShellPopoverTriggerStub = defineComponent({
    name: "ShellPopoverTriggerStub",
    props: ["asChild"],
    setup(_, { slots }) {
        return () => h("div", {}, slots.default ? slots.default() : undefined);
    },
});

const ControlRangeCalendarStub = defineComponent({
    name: "ControlRangeCalendarStub",
    props: ["modelValue", "minValue", "maxValue", "locale", "disabled"],
    emits: ["update:modelValue"],
    setup(props, { attrs }) {
        return () => h("div", { "data-range-calendar": "true", ...attrs });
    },
});

vi.mock("@vueda/controls/date-range-field/ControlDateRangeField.vue", () => ({ default: ControlDateRangeFieldStub }));
vi.mock("@vueda/controls/date-range-field/ControlDateRangeFieldInput.vue", () => ({
    default: ControlDateRangeFieldInputStub,
}));

vi.mock("@vueda/shell/popover/ShellPopover.vue", () => ({ default: ShellPopoverStub }));
vi.mock("@vueda/shell/popover/ShellPopoverContent.vue", () => ({ default: ShellPopoverContentStub }));
vi.mock("@vueda/shell/popover/ShellPopoverTrigger.vue", () => ({ default: ShellPopoverTriggerStub }));

vi.mock("@vueda/controls/range-calendar/ControlRangeCalendar.vue", () => ({ default: ControlRangeCalendarStub }));

vi.mock("@internationalized/date", () => ({
    parseDate: vi.fn((str) => ({ toString: () => str, _raw: str })),
    parseDateTime: vi.fn((str) => ({ toString: () => str, _raw: str })),
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

const importComponent = () => import("@vueda/widgets/WidgetDateRangeField.vue");

describe("lib/widgets/WidgetDateRangeField.vue", () => {
    let WidgetDateRangeField;

    beforeEach(async () => {
        WidgetDateRangeField = (await importComponent()).default;
        mockedUseWidget.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        scopedIt("renders a ControlDateRangeField element", async () => {
            const wrapper = mount(WidgetDateRangeField);
            expect(wrapper.get(QA_SEL).element.tagName).toBe("DIV");
        });

        scopedIt("sets data-qa attribute on the root control", async () => {
            const wrapper = mount(WidgetDateRangeField);
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
        });

        scopedIt("renders calendar trigger button", async () => {
            const wrapper = mount(WidgetDateRangeField);
            expect(wrapper.get(QA_TRIGGER_SEL).exists()).toBe(true);
        });
    });

    describe("Field context integration", () => {
        scopedIt("applies fieldId from field context to the control id", async () => {
            const fc = { state: reactive({ fieldId: "field-456" }) };
            const wrapper = mount(WidgetDateRangeField, {
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBe("field-456");
        });

        scopedIt("renders without field context (id is undefined)", async () => {
            const wrapper = mount(WidgetDateRangeField);
            expect(wrapper.get(QA_SEL).attributes("id")).toBeUndefined();
        });
    });

    describe("Widget state bindings", () => {
        scopedIt("applies disabled state", async () => {
            const wrapper = mount(WidgetDateRangeField);
            expect(wrapper.get(QA_SEL).attributes("disabled")).toBeUndefined();
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("disabled")).toBe("true");
        });

        scopedIt("applies combinedName to name attribute", async () => {
            const wrapper = mount(WidgetDateRangeField);
            expect(wrapper.get(QA_SEL).attributes("name")).toBe("test-name");
        });
    });

    describe("Accessibility attributes", () => {
        scopedIt("applies aria-invalid when validation fails", async () => {
            const wrapper = mount(WidgetDateRangeField);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
            widgetContext.state.validationState.invalid = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBe("true");
        });

        scopedIt("does not render aria-invalid='false' when valid", async () => {
            const wrapper = mount(WidgetDateRangeField);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies aria-required when required", async () => {
            const wrapper = mount(WidgetDateRangeField);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
            widgetContext.state.required = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBe("true");
        });

        scopedIt("does not render aria-required='false' when not required", async () => {
            const wrapper = mount(WidgetDateRangeField);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
        });
    });

    describe("Events", () => {
        scopedIt("calls widgetContext.blur on blur event", async () => {
            const wrapper = mount(WidgetDateRangeField);
            await wrapper.get(QA_SEL).trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.focus on focus event", async () => {
            const wrapper = mount(WidgetDateRangeField);
            await wrapper.get(QA_SEL).trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });
    });

    describe("Value conversion", () => {
        scopedIt("converts range object with lower/upper to rangeValue with start/end", async () => {
            const { parseDate } = await import("@internationalized/date");
            mount(WidgetDateRangeField);
            widgetContext.state.combinedValue = { lower: "2025-03-30", upper: "2025-04-05" };
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(parseDate).toHaveBeenCalledWith("2025-03-30");
            expect(parseDate).toHaveBeenCalledWith("2025-04-05");
        });

        scopedIt("converts null combinedValue to undefined rangeValue", async () => {
            const wrapper = mount(WidgetDateRangeField);
            widgetContext.state.combinedValue = null;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("modelvalue")).toBeUndefined();
        });

        scopedIt("converts datetime range strings using parseDateTime", async () => {
            const { parseDateTime } = await import("@internationalized/date");
            mount(WidgetDateRangeField);
            widgetContext.state.combinedValue = {
                lower: "2025-03-30T14:30",
                upper: "2025-04-05T16:00",
            };
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(parseDateTime).toHaveBeenCalledWith("2025-03-30T14:30");
            expect(parseDateTime).toHaveBeenCalledWith("2025-04-05T16:00");
        });

        scopedIt("setting rangeValue updates combinedValue back to lower/upper", async () => {
            const wrapper = mount(WidgetDateRangeField);
            const ctrl = wrapper.getComponent(ControlDateRangeFieldStub);
            const newRange = {
                start: { toString: () => "2025-06-01" },
                end: { toString: () => "2025-06-15" },
            };
            ctrl.vm.$emit("update:modelValue", newRange);
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(widgetContext.state.combinedValue).toEqual({
                lower: "2025-06-01",
                upper: "2025-06-15",
            });
        });
    });

    describe("Attribute passthrough", () => {
        scopedIt("passes through non-class attrs via v-bind=$attrs", async () => {
            const wrapper = mount(WidgetDateRangeField, {
                attrs: { "aria-label": "date range field", "data-testid": "my-range" },
            });
            const el = wrapper.get(QA_SEL);
            expect(el.attributes("aria-label")).toBe("date range field");
            expect(el.attributes("data-testid")).toBe("my-range");
        });
    });
});
