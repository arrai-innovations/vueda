import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-date-field";
const QA_SEL = `[data-qa='${QA}']`;
const QA_TRIGGER_SEL = `[data-qa='${QA}-trigger']`;

const ControlDateFieldStub = defineComponent({
    name: "ControlDateFieldStub",
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
                slots.default ? slots.default({ segments: [{ part: "day", value: "1" }] }) : undefined,
            );
    },
});

const ControlDateFieldInputStub = defineComponent({
    name: "ControlDateFieldInputStub",
    props: ["part"],
    setup(props, { attrs }) {
        return () => h("span", { "data-part": props.part, ...attrs });
    },
});

const ControlPopoverStub = defineComponent({
    name: "ControlPopoverStub",
    props: ["open"],
    emits: ["update:open"],
    setup(_, { slots }) {
        return () => h("div", {}, slots.default ? slots.default() : undefined);
    },
});

const ControlPopoverContentStub = defineComponent({
    name: "ControlPopoverContentStub",
    setup(_, { slots }) {
        return () => h("div", {}, slots.default ? slots.default() : undefined);
    },
});

const ControlPopoverTriggerStub = defineComponent({
    name: "ControlPopoverTriggerStub",
    props: ["asChild"],
    setup(_, { slots }) {
        return () => h("div", {}, slots.default ? slots.default() : undefined);
    },
});

const ControlCalendarStub = defineComponent({
    name: "ControlCalendarStub",
    props: ["modelValue", "minValue", "maxValue", "locale", "disabled"],
    emits: ["update:modelValue"],
    setup(props, { attrs }) {
        return () => h("div", { "data-calendar": "true", ...attrs });
    },
});

vi.mock("@vueda/controls/date-field", () => ({
    ControlDateField: ControlDateFieldStub,
    ControlDateFieldInput: ControlDateFieldInputStub,
}));

vi.mock("@vueda/controls/popover", () => ({
    ControlPopover: ControlPopoverStub,
    ControlPopoverContent: ControlPopoverContentStub,
    ControlPopoverTrigger: ControlPopoverTriggerStub,
}));

vi.mock("@vueda/controls/calendar", () => ({
    ControlCalendar: ControlCalendarStub,
}));

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

const importComponent = () => import("@vueda/widgets/WidgetDateField.vue");

describe("lib/widgets/WidgetDateField.vue", () => {
    let WidgetDateField;

    beforeEach(async () => {
        WidgetDateField = (await importComponent()).default;
        mockedUseWidget.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        scopedIt("renders a ControlDateField element", async () => {
            const wrapper = mount(WidgetDateField);
            expect(wrapper.get(QA_SEL).element.tagName).toBe("DIV");
        });

        scopedIt("sets data-qa attribute on the root control", async () => {
            const wrapper = mount(WidgetDateField);
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
        });

        scopedIt("renders calendar trigger button", async () => {
            const wrapper = mount(WidgetDateField);
            expect(wrapper.get(QA_TRIGGER_SEL).exists()).toBe(true);
        });
    });

    describe("Field context integration", () => {
        scopedIt("applies fieldId from field context to the control id", async () => {
            const fc = { state: reactive({ fieldId: "field-123" }) };
            const wrapper = mount(WidgetDateField, {
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            expect(wrapper.get(QA_SEL).attributes("id")).toBe("field-123");
        });

        scopedIt("renders without field context (id is undefined)", async () => {
            const wrapper = mount(WidgetDateField);
            expect(wrapper.get(QA_SEL).attributes("id")).toBeUndefined();
        });
    });

    describe("Widget state bindings", () => {
        scopedIt("applies disabled state", async () => {
            const wrapper = mount(WidgetDateField);
            expect(wrapper.get(QA_SEL).attributes("disabled")).toBeUndefined();
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("disabled")).toBe("true");
        });

        scopedIt("applies combinedName to name attribute", async () => {
            const wrapper = mount(WidgetDateField);
            expect(wrapper.get(QA_SEL).attributes("name")).toBe("test-name");
        });
    });

    describe("Accessibility attributes", () => {
        scopedIt("applies aria-invalid when validation fails", async () => {
            const wrapper = mount(WidgetDateField);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
            widgetContext.state.validationState.invalid = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBe("true");
        });

        scopedIt("does not render aria-invalid='false' when valid", async () => {
            const wrapper = mount(WidgetDateField);
            expect(wrapper.get(QA_SEL).attributes("aria-invalid")).toBeUndefined();
        });

        scopedIt("applies aria-required when required", async () => {
            const wrapper = mount(WidgetDateField);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
            widgetContext.state.required = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBe("true");
        });

        scopedIt("does not render aria-required='false' when not required", async () => {
            const wrapper = mount(WidgetDateField);
            expect(wrapper.get(QA_SEL).attributes("aria-required")).toBeUndefined();
        });
    });

    describe("Events", () => {
        scopedIt("calls widgetContext.blur on blur event", async () => {
            const wrapper = mount(WidgetDateField);
            await wrapper.get(QA_SEL).trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.focus on focus event", async () => {
            const wrapper = mount(WidgetDateField);
            await wrapper.get(QA_SEL).trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });
    });

    describe("Value conversion", () => {
        scopedIt("converts ISO date string to dateValue on the control", async () => {
            const { parseDate } = await import("@internationalized/date");
            mount(WidgetDateField);
            widgetContext.state.combinedValue = "2025-03-30";
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(parseDate).toHaveBeenCalledWith("2025-03-30");
        });

        scopedIt("converts null combinedValue to undefined dateValue", async () => {
            const wrapper = mount(WidgetDateField);
            widgetContext.state.combinedValue = null;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("modelvalue")).toBeUndefined();
        });

        scopedIt("converts empty string combinedValue to undefined dateValue", async () => {
            const wrapper = mount(WidgetDateField);
            widgetContext.state.combinedValue = "";
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(wrapper.get(QA_SEL).attributes("modelvalue")).toBeUndefined();
        });

        scopedIt("converts ISO datetime string with parseDateTime", async () => {
            const { parseDateTime } = await import("@internationalized/date");
            mount(WidgetDateField);
            widgetContext.state.combinedValue = "2025-03-30T14:30";
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(parseDateTime).toHaveBeenCalledWith("2025-03-30T14:30");
        });
    });

    describe("Attribute passthrough", () => {
        scopedIt("passes through non-class attrs via v-bind=$attrs", async () => {
            const wrapper = mount(WidgetDateField, {
                attrs: { "aria-label": "date field", "data-testid": "my-date" },
            });
            const el = wrapper.get(QA_SEL);
            expect(el.attributes("aria-label")).toBe("date field");
            expect(el.attributes("data-testid")).toBe("my-date");
        });
    });
});
