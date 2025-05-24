import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const themeFn = vi.fn((key) => `t-${key}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: mockedUseWidgetTheme,
}));

const mockedUseWarningClass = vi.fn(() => "pt-class");
vi.mock("@vueda/use/useWarningClass.js", () => ({
    PASSTHROUGH_OPTION_PROPS: {},
    useWarningClass: mockedUseWarningClass,
}));

let widgetContext;
const mockedUseWidget = vi.fn(() => {
    widgetContext = {
        state: reactive({
            combinedValue: false,
            disabled: false,
            widgetId: "wid",
            validationState: reactive({ invalid: false }),
            combinedName: "name",
            required: false,
            value: null,
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

const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    props: ["for"],
    setup(props, { slots }) {
        return () =>
            h(
                "label",
                { "data-qa": "widget-label", for: props.for },
                slots.default ? slots.default({ class: "lbl" }) : null,
            );
    },
});
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS: {},
    getWidgetSlotsComputed: () => () => [],
}));

const ToggleSwitchStub = defineComponent({
    name: "ToggleSwitchStub",
    props: ["modelValue", "class", "inputId", "disabled", "invalid", "name", "pt", "ariaRequired"],
    emits: ["update:modelValue", "blur", "focus"],
    setup(props, { emit, attrs }) {
        return () =>
            h("input", {
                "data-qa": "toggle-switch",
                type: "checkbox",
                class: props.class,
                id: props.inputId,
                disabled: props.disabled,
                "data-invalid": props.invalid,
                name: props.name,
                "data-pt": props.pt,
                "aria-required": props.ariaRequired,
                checked: props.modelValue,
                ...attrs,
                onBlur: () => emit("blur"),
                onFocus: () => emit("focus"),
                onChange: (e) => emit("update:modelValue", e.target.checked),
            });
    },
});
vi.mock("primevue/toggleswitch", () => ({ default: ToggleSwitchStub }));

const importComponent = () => import("@vueda/widgets/WidgetCheckbox.vue");

describe("lib/widgets/WidgetCheckbox.vue", () => {
    let WidgetCheckbox, vue;

    beforeEach(async () => {
        WidgetCheckbox = (await importComponent()).default;
        vue = await import("vue");
        mockedUseWidget.mockClear();
        mockedUseWidgetTheme.mockClear();
        mockedUseWarningClass.mockClear();
        themeFn.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("applies theme classes and forwards attrs", async () => {
        const wrapper = mount(WidgetCheckbox, {
            attrs: { class: "extra", "aria-label": "a", value: "v" },
        });
        await vue.nextTick();
        expect(mockedUseWidgetTheme).toHaveBeenCalled();
        expect(wrapper.classes()).toContain("t-root");
        expect(wrapper.classes()).not.toContain("extra");
        const inner = wrapper.get("[data-qa='widget-checkbox-inner']");
        expect(inner.classes()).toContain("t-inner");
        const toggle = wrapper.get("[data-qa='toggle-switch']");
        expect(toggle.classes()).toContain("t-input");
        expect(toggle.attributes("aria-label")).toBe("a");
        expect(toggle.attributes("value")).toBeUndefined();
        expect(toggle.attributes("id")).toBe("wid");
    });

    scopedIt("updates value and handles focus/blur", async () => {
        const wrapper = mount(WidgetCheckbox);
        await vue.nextTick();
        const toggle = wrapper.get("[data-qa='toggle-switch']");
        await toggle.trigger("focus");
        expect(widgetContext.focus).toHaveBeenCalled();
        await toggle.trigger("blur");
        expect(widgetContext.blur).toHaveBeenCalled();
        await toggle.setValue(true); // this triggers change event due to wrapper API
        await vue.nextTick();
        expect(widgetContext.state.combinedValue).toBe(true);
    });

    scopedIt("sets aria-required when required and value null", async () => {
        const wrapper = mount(WidgetCheckbox);
        widgetContext.state.required = true;
        widgetContext.state.value = null;
        await vue.nextTick();
        const toggle = wrapper.get("[data-qa='toggle-switch']");
        expect(toggle.attributes("aria-required")).toBe("true");
    });
});
