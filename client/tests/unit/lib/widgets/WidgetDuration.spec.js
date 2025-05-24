import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";

const clickSpies = {};

const InputNumberStub = defineComponent({
    name: "InputNumberStub",
    props: ["modelValue"],
    emits: ["update:model-value"],
    setup(props, { emit, attrs, expose }) {
        const label = attrs["aria-label"];
        const onClick = vi.fn();
        clickSpies[label] = onClick;
        expose({ onClick });
        return () =>
            h("input", {
                "data-qa": "input-number",
                "data-label": label,
                value: props.modelValue ?? "",
                onInput: (e) => emit("update:model-value", Number(e.target.value)),
                onClick,
            });
    },
});

const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    emits: ["click"],
    setup(_, { emit, slots }) {
        return () =>
            h(
                "div",
                { "data-qa": "widget-label", onClick: () => emit("click") },
                slots.default ? slots.default({ class: "" }) : null,
            );
    },
});
const WIDGET_LABEL_PROPS = {};
const getWidgetSlotsComputed = () => () => [];

vi.mock("primevue/inputnumber", () => ({ default: InputNumberStub }));
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    __esModule: true,
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS,
    getWidgetSlotsComputed,
}));
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: () => () => "" }));
vi.mock("@vueda/use/useWarningClass.js", () => ({ useWarningClass: () => ref({}), PASSTHROUGH_OPTION_PROPS: {} }));

let WidgetDuration;

beforeEach(async () => {
    WidgetDuration = (await import("@vueda/widgets/WidgetDuration.vue")).default;
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/widgets/WidgetDuration.vue", () => {
    scopedIt("renders minutes input by default", () => {
        const wrapper = mount(WidgetDuration, { props: { modelValue: { minutes: 1 } } });
        expect(wrapper.findAllComponents(InputNumberStub).length).toBe(1);
        expect(wrapper.find('input[data-label="minutes"]').exists()).toBe(true);
        expect(wrapper.find('input[data-label="hours"]').exists()).toBe(false);
        expect(wrapper.find('input[data-label="days"]').exists()).toBe(false);
    });

    scopedIt("focuses first input and emits updates", async () => {
        const wrapper = mount(WidgetDuration, {
            props: {
                modelValue: { days: 1, hours: 2, minutes: 3 },
                showDays: true,
                showHours: true,
            },
        });
        await wrapper.get('[data-qa="widget-label"]').trigger("click");
        expect(clickSpies.days).toHaveBeenCalled();

        await wrapper.find('input[data-label="hours"]').setValue("5");
        const emitted = wrapper.emitted("update:modelValue");
        expect(emitted).toBeTruthy();
        expect(emitted[0][0]).toEqual({ days: 1, hours: 5, minutes: 3, seconds: undefined });
    });
});
