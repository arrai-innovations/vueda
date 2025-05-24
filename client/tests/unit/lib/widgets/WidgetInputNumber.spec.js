import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["label", "unstyled", "variant"],
    setup(props, { slots }) {
        return () =>
            h(
                "button",
                { "data-qa": "prime-button", "data-label": props.label },
                slots.default ? slots.default() : null,
            );
    },
});
const InputGroupStub = defineComponent({
    name: "InputGroupStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "input-group" }, slots.default ? slots.default() : null);
    },
});
const InputGroupAddonStub = defineComponent({
    name: "InputGroupAddonStub",
    setup(_, { slots }) {
        return () => h("span", { "data-qa": "input-group-addon" }, slots.default ? slots.default() : null);
    },
});
const PopoverStub = defineComponent({
    name: "PopoverStub",
    setup(_, { slots, expose }) {
        const toggle = vi.fn();
        expose({ toggle });
        return () => h("div", { "data-qa": "popover" }, slots.default ? slots.default() : null);
    },
});

vi.mock("primevue/button", () => ({ default: ButtonStub }));
vi.mock("primevue/inputgroup", () => ({ default: InputGroupStub }));
vi.mock("primevue/inputgroupaddon", () => ({ default: InputGroupAddonStub }));
vi.mock("primevue/popover", () => ({ default: PopoverStub }));

const EmptyComponentStub = defineComponent({
    name: "EmptyComponentStub",
    setup(_, { slots }) {
        return () => h("span", { "data-qa": "empty" }, slots.default ? slots.default() : null);
    },
});
vi.mock("@vueda/components/EmptyComponent.vue", () => ({ default: EmptyComponentStub }));

const themeFn = vi.fn(() => "theme");
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: mockedUseWidgetTheme,
}));
vi.mock("@vueda/use/useTheme.js", () => ({ THEME_OVERRIDE_PROPS: {} }));
vi.mock("@vueda/use/useWarningClass.js", () => ({ PASSTHROUGH_OPTION_PROPS: {} }));

const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    props: ["for"],
    setup(_, { slots }) {
        return () => h("label", { "data-qa": "widget-label" }, slots.default ? slots.default({ class: "" }) : null);
    },
});
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS: {},
    getWidgetSlotsComputed: () => () => [],
}));

let WidgetInputNumber, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    WidgetInputNumber = (await import("@vueda/widgets/WidgetInputNumber.vue")).default;
    mockedUseWidgetTheme.mockClear();
    themeFn.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("converts display value using unit definitions", async () => {
    const wrapper = mount(WidgetInputNumber, {
        props: {
            name: "num",
            modelValue: "5000",
            unit: [{ label: "km", value: "km" }],
            unitDefs: { km: { numerator: 1000 } },
            baseUnit: "m",
        },
    });
    await vue.nextTick();
    await vue.nextTick();
    expect(wrapper.get("input").element.value).toBe("5");
    await wrapper.get("input").setValue("10");
    await vue.nextTick();
    expect(wrapper.emitted()["update:modelValue"][0]).toEqual(["10000"]);
});

scopedIt("prevents minus sign input when min disallows", () => {
    const wrapper = mount(WidgetInputNumber, { props: { min: 0 } });
    const input = wrapper.get("input");
    const evt = new KeyboardEvent("keydown", { key: "-", cancelable: true });
    const prevent = vi.fn();
    Object.defineProperty(evt, "preventDefault", { value: prevent });
    input.element.dispatchEvent(evt);
    expect(prevent).toHaveBeenCalled();

    const paste = new Event("paste", { cancelable: true });
    Object.assign(paste, { clipboardData: { getData: () => "-5" } });
    const preventPaste = vi.fn();
    Object.defineProperty(paste, "preventDefault", { value: preventPaste });
    input.element.dispatchEvent(paste);
    expect(preventPaste).toHaveBeenCalled();
});
