import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const containerClickSpy = vi.fn();
const MultiSelectStub = defineComponent({
    name: "MultiSelectStub",
    props: ["modelValue", "options", "class", "pt", "disabled", "invalid", "ariaLabelledby", "ariaRequired"],
    emits: ["update:modelValue", "focus", "blur"],
    setup(props, { emit, expose, attrs }) {
        expose({ onContainerClick: containerClickSpy });
        return () =>
            h("div", {
                "data-qa": "multi-select",
                class: props.class,
                "data-pt": props.pt,
                ...attrs,
                onFocus: () => emit("focus"),
                onBlur: () => emit("blur"),
            });
    },
});
vi.mock("primevue/multiselect", () => ({ default: MultiSelectStub }));

const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    emits: ["click"],
    setup(_, { emit, slots }) {
        return () =>
            h(
                "label",
                { "data-qa": "widget-label", onClick: () => emit("click") },
                slots.default ? slots.default({ class: "lbl" }) : null,
            );
    },
});
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS: {},
    getWidgetSlotsComputed: () => () => [],
}));

const themeFn = vi.fn((k) => `t-${k}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: mockedUseWidgetTheme }));

const mockedUseWarningClass = vi.fn(() => "pt-class");
vi.mock("@vueda/use/useWarningClass.js", () => ({
    PASSTHROUGH_OPTION_PROPS: {},
    useWarningClass: mockedUseWarningClass,
}));

let widgetState;
const focusSpy = vi.fn();
const blurSpy = vi.fn();
const mockedUseWidget = vi.fn(() => {
    widgetState = reactive({
        combinedValue: null,
        disabled: false,
        validationState: { invalid: false },
        widgetId: "wid",
        required: false,
    });
    return { state: widgetState, focus: focusSpy, blur: blurSpy };
});
vi.mock("@vueda/use/useWidget.js", () => ({ WIDGET_PROPS: {}, WIDGET_EMITS: [], useWidget: mockedUseWidget }));

let WidgetMultiSelect;

beforeEach(async () => {
    WidgetMultiSelect = (await import("@vueda/widgets/WidgetMultiSelect.vue")).default;
    mockedUseWidget.mockClear();
    mockedUseWidgetTheme.mockClear();
    themeFn.mockClear();
    focusSpy.mockClear();
    blurSpy.mockClear();
    containerClickSpy.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/widgets/WidgetMultiSelect.vue", () => {
    scopedIt("passes props to MultiSelect and forwards events", async () => {
        const onFocus = vi.fn();
        const onBlur = vi.fn();
        const wrapper = mount(WidgetMultiSelect, {
            props: { options: [{ label: "One", value: 1 }] },
            attrs: { class: "extra", "on-focus": onFocus, "on-blur": onBlur },
        });
        expect(mockedUseWidgetTheme).toHaveBeenCalled();
        expect(wrapper.classes()).toContain("t-root");

        const ms = wrapper.getComponent(MultiSelectStub);
        expect(ms.props("options")).toEqual([{ label: "One", value: 1 }]);
        expect(ms.props("pt")).toBe("pt-class");
        expect(ms.props("disabled")).toBe(false);
        expect(ms.props("invalid")).toBe(false);
        expect(ms.props("ariaLabelledby")).toBe("wid");
        expect(ms.props("ariaRequired")).toBe(false);
        expect(ms.classes()).toContain("lbl");
        expect(ms.classes()).toContain("extra");

        await ms.trigger("focus");
        expect(focusSpy).toHaveBeenCalled();
        expect(onFocus).toHaveBeenCalled();

        await ms.trigger("blur");
        expect(blurSpy).toHaveBeenCalled();
        expect(onBlur).toHaveBeenCalled();
    });

    scopedIt("focuses select when label clicked", async () => {
        const wrapper = mount(WidgetMultiSelect, { props: { options: [] } });
        await wrapper.get("[data-qa='widget-label']").trigger("click");
        expect(containerClickSpy).toHaveBeenCalled();
    });
});
