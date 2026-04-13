import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const QA = "widget-time-range-field";
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
                    "data-control": "time-field",
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

const importComponent = () => import("@vueda/widgets/WidgetTimeRangeField.vue");

describe("lib/widgets/WidgetTimeRangeField.vue", () => {
    let WidgetTimeRangeField;

    beforeEach(async () => {
        WidgetTimeRangeField = (await importComponent()).default;
        mockedUseWidget.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Rendering", () => {
        scopedIt("renders a wrapper div with data-qa", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            expect(wrapper.get(QA_SEL).exists()).toBe(true);
        });

        scopedIt("renders two TimeField instances", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const fields = wrapper.findAll('[data-control="time-field"]');
            expect(fields).toHaveLength(2);
        });

        scopedIt("renders a separator between the two fields", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const separator = wrapper.find('[aria-hidden="true"]');
            expect(separator.exists()).toBe(true);
        });
    });

    describe("Field context integration", () => {
        scopedIt("applies fieldId to the first (start) time field", async () => {
            const fc = { state: reactive({ fieldId: "field-range-1" }) };
            const wrapper = mount(WidgetTimeRangeField, {
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            const fields = wrapper.findAll('[data-control="time-field"]');
            expect(fields[0].attributes("id")).toBe("field-range-1");
        });

        scopedIt("does not apply fieldId to the second (end) time field", async () => {
            const fc = { state: reactive({ fieldId: "field-range-1" }) };
            const wrapper = mount(WidgetTimeRangeField, {
                global: { provide: { [FieldContextSymbol]: fc } },
            });
            const fields = wrapper.findAll('[data-control="time-field"]');
            expect(fields[1].attributes("id")).toBeUndefined();
        });

        scopedIt("renders without field context (id is undefined)", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const fields = wrapper.findAll('[data-control="time-field"]');
            expect(fields[0].attributes("id")).toBeUndefined();
        });
    });

    describe("Widget state bindings", () => {
        scopedIt("applies disabled state to both fields", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const fields = wrapper.findAll('[data-control="time-field"]');
            expect(fields[0].attributes("disabled")).toBeUndefined();
            expect(fields[1].attributes("disabled")).toBeUndefined();
            widgetContext.state.disabled = true;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(fields[0].attributes("disabled")).toBe("true");
            expect(fields[1].attributes("disabled")).toBe("true");
        });

        scopedIt("applies combinedName with _lower suffix to first field", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const fields = wrapper.findAll('[data-control="time-field"]');
            expect(fields[0].attributes("name")).toBe("test-name_lower");
        });

        scopedIt("applies combinedName with _upper suffix to second field", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const fields = wrapper.findAll('[data-control="time-field"]');
            expect(fields[1].attributes("name")).toBe("test-name_upper");
        });
    });

    describe("Value conversion", () => {
        scopedIt("converts range object with lower/upper to start/end time values", async () => {
            const { parseTime } = await import("@internationalized/date");
            mount(WidgetTimeRangeField);
            widgetContext.state.combinedValue = { lower: "09:00:00", upper: "17:00:00" };
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(parseTime).toHaveBeenCalledWith("09:00:00");
            expect(parseTime).toHaveBeenCalledWith("17:00:00");
        });

        scopedIt("converts null combinedValue to undefined for both fields", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            widgetContext.state.combinedValue = null;
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            const fields = wrapper.findAll('[data-control="time-field"]');
            expect(fields[0].attributes("modelvalue")).toBeUndefined();
            expect(fields[1].attributes("modelvalue")).toBeUndefined();
        });

        scopedIt("setting start value updates combinedValue.lower", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const fields = wrapper.findAllComponents(ControlTimeFieldStub);
            const newTime = { toString: () => "10:30:00" };
            fields[0].vm.$emit("update:modelValue", newTime);
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(widgetContext.state.combinedValue.lower).toBe("10:30:00");
        });

        scopedIt("setting end value updates combinedValue.upper", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const fields = wrapper.findAllComponents(ControlTimeFieldStub);
            const newTime = { toString: () => "18:45:00" };
            fields[1].vm.$emit("update:modelValue", newTime);
            const { nextTick } = await vi.importActual("vue");
            await nextTick();
            expect(widgetContext.state.combinedValue.upper).toBe("18:45:00");
        });
    });

    describe("Events", () => {
        scopedIt("calls widgetContext.blur on blur from start field", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const fields = wrapper.findAll('[data-control="time-field"]');
            await fields[0].trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.focus on focus from start field", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const fields = wrapper.findAll('[data-control="time-field"]');
            await fields[0].trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.blur on blur from end field", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const fields = wrapper.findAll('[data-control="time-field"]');
            await fields[1].trigger("blur");
            expect(widgetContext.blur).toHaveBeenCalledTimes(1);
        });

        scopedIt("calls widgetContext.focus on focus from end field", async () => {
            const wrapper = mount(WidgetTimeRangeField);
            const fields = wrapper.findAll('[data-control="time-field"]');
            await fields[1].trigger("focus");
            expect(widgetContext.focus).toHaveBeenCalledTimes(1);
        });
    });

    describe("Attribute passthrough", () => {
        scopedIt("passes through attrs to the wrapper div", async () => {
            const wrapper = mount(WidgetTimeRangeField, {
                attrs: { "aria-label": "time range", "data-testid": "my-time-range" },
            });
            const el = wrapper.get(QA_SEL);
            expect(el.attributes("aria-label")).toBe("time range");
            expect(el.attributes("data-testid")).toBe("my-time-range");
        });
    });
});
