import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";

const focusSpy = vi.fn();
const blurSpy = vi.fn();
const mockedUseWidget = vi.fn();
vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_PROPS: {},
    WIDGET_EMITS: [],
    useWidget: mockedUseWidget,
}));

vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: vi.fn(() => () => "t"),
}));

vi.mock("@vueda/use/useWarningClass.js", () => ({
    PASSTHROUGH_OPTION_PROPS: {},
    useWarningClass: vi.fn(() => "pt"),
}));

const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "widget-label" }, slots.default ? slots.default({ class: "stub" }) : null);
    },
});
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS: {},
    getWidgetSlotsComputed: () => () => [],
}));

const SliderStub = defineComponent({
    name: "SliderStub",
    props: ["modelValue", "min", "max", "name", "disabled", "invalid", "pt", "ariaLabelledby", "ariaRequired"],
    emits: ["change", "slideend", "update:modelValue"],
    setup(props, { attrs }) {
        return () => h("div", { "data-qa": "slider", ...attrs });
    },
});
vi.mock("primevue/slider", () => ({ default: SliderStub }));

let WidgetSlider;
let state;

describe("lib/widgets/WidgetSlider.vue", () => {
    beforeEach(async () => {
        state = reactive({
            widgetId: "wid",
            combinedName: "combined",
            combinedValue: null,
            disabled: false,
            validationState: reactive({ invalid: false, warning: false }),
            required: false,
        });
        mockedUseWidget.mockReturnValue({ state, focus: focusSpy, blur: blurSpy });
        WidgetSlider = (await import("@vueda/widgets/WidgetSlider.vue")).default;
        focusSpy.mockClear();
        blurSpy.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("renders min and max when no value", () => {
        const wrapper = mount(WidgetSlider, {
            props: { name: "foo", minValue: 1, maxValue: 5 },
        });
        expect(wrapper.text()).toContain("[1,5]");
    });

    scopedIt("renders current value when present", () => {
        state.combinedValue = [2, 4];
        const wrapper = mount(WidgetSlider, { props: { name: "foo" } });
        expect(wrapper.get("span").text()).toBe(JSON.stringify([2, 4], null, 2));
    });

    scopedIt("passes props to slider and handles events", async () => {
        state.combinedValue = [3, 6];
        state.disabled = true;
        state.validationState.invalid = true;
        state.required = true;
        const wrapper = mount(WidgetSlider, {
            props: { name: "foo", minValue: 2, maxValue: 10 },
        });
        const slider = wrapper.getComponent(SliderStub);
        expect(slider.props("min")).toBe(2);
        expect(slider.props("max")).toBe(10);
        expect(slider.props("name")).toBe("combined");
        expect(slider.props("disabled")).toBe(true);
        expect(slider.props("invalid")).toBe(true);
        expect(slider.props("pt")).toBe("pt");
        expect(slider.props("ariaLabelledby")).toBe("wid");
        expect(slider.props("ariaRequired")).toBe(true);

        slider.vm.$emit("change");
        slider.vm.$emit("slideend");
        await nextTick();
        expect(focusSpy).toHaveBeenCalled();
        expect(blurSpy).toHaveBeenCalled();
    });
});
