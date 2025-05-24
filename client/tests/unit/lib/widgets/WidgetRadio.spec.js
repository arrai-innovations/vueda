import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { computed, defineComponent, h, reactive, ref } from "vue";

const themeFn = vi.fn((k) => `t-${k}`);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: vi.fn(() => themeFn),
}));

vi.mock("@vueda/use/useWarningClass.js", () => ({
    PASSTHROUGH_OPTION_PROPS: {},
    useWarningClass: vi.fn(() => ({})),
}));

const RadioButtonStub = defineComponent({
    name: "RadioButtonStub",
    props: ["modelValue", "value"],
    emits: ["update:modelValue", "focus", "blur"],
    setup(props, { emit }) {
        return () =>
            h("input", {
                type: "radio",
                "data-qa": "radio-button",
                value: props.value,
                checked: props.modelValue === props.value,
                onFocus: () => emit("focus"),
                onBlur: () => emit("blur"),
                onChange: () => emit("update:modelValue", props.value),
            });
    },
});
vi.mock("primevue/radiobutton", () => ({ default: RadioButtonStub }));

const focusSpy = vi.fn();

vi.mock("@vueda/use/useWidget.js", async () => {
    await vi.importActual("vue");
    return {
        WIDGET_EMITS: ["update:modelValue"],
        WIDGET_PROPS: {},
        useWidget: (props, emit) => {
            const cv = ref(props.modelValue);
            const state = reactive({
                widgetId: "wid",
                combinedName: props.name || "name",
                combinedValue: computed({
                    get: () => cv.value,
                    set: (v) => {
                        cv.value = v;
                        emit("update:modelValue", v);
                    },
                }),
                required: false,
                disabled: false,
                validationState: { invalid: false },
                focused: false,
            });
            return {
                state,
                focus: () => {
                    focusSpy();
                    state.focused = true;
                },
                blur: () => {},
            };
        },
    };
});

const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    props: ["id", "labelClass", "labelTag"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "widget-label", id: props.id }, slots.default ? slots.default({ class: "" }) : null);
    },
});
vi.mock("@vueda/widgets/WidgetLabel.vue", async () => {
    const vue = await vi.importActual("vue");
    return {
        __esModule: true,
        default: WidgetLabelStub,
        WIDGET_LABEL_PROPS: {},
        getWidgetSlotsComputed: () => vue.computed(() => []),
    };
});

let WidgetRadio;

beforeEach(async () => {
    WidgetRadio = (await import("@vueda/widgets/WidgetRadio.vue")).default;
    themeFn.mockClear();
    focusSpy.mockClear();
});

describe("lib/widgets/WidgetRadio.vue", () => {
    scopedIt("renders options and emits model update", async () => {
        const wrapper = mount(WidgetRadio, {
            props: {
                options: [
                    { label: "One", value: "1" },
                    { label: "Two", value: "2" },
                ],
                modelValue: null,
            },
        });
        expect(wrapper.findAll("li").length).toBe(2);
        expect(wrapper.text()).toContain("One");
        expect(wrapper.text()).toContain("Two");

        await wrapper.findAll('input[data-qa="radio-button"]')[0].trigger("change");
        expect(wrapper.emitted("update:modelValue")[0]).toEqual(["1"]);
    });

    scopedIt("focuses widget and calls onFocus handler", async () => {
        const onFocus = vi.fn();
        const wrapper = mount(WidgetRadio, {
            props: {
                options: [{ label: "A", value: "a" }],
                modelValue: null,
                onFocus,
            },
        });
        const input = wrapper.find('input[data-qa="radio-button"]');
        await input.trigger("focus");
        expect(focusSpy).toHaveBeenCalled();
        expect(onFocus).toHaveBeenCalled();
    });

    scopedIt("supports per-option slots", async () => {
        const wrapper = mount(WidgetRadio, {
            props: {
                options: [
                    { label: "One", value: "1" },
                    { label: "Two", value: "2" },
                ],
            },
            slots: {
                "radio(1)": "<span data-qa='custom-radio-1'>CR1</span>",
                "label(2)": "<span data-qa='custom-label-2'>CL2</span>",
            },
        });
        expect(wrapper.find('[data-qa="custom-radio-1"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="custom-label-2"]').exists()).toBe(true);
        // default elements should still render for other options
        const defaultLabel1 = wrapper.findAll("li")[0].text();
        expect(defaultLabel1).toContain("One");
    });
});
