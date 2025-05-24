import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const SimpleStub = (qa) =>
    defineComponent({
        name: `${qa}-stub`,
        setup(_, { slots, attrs }) {
            return () => h("div", { "data-qa": qa, ...attrs }, slots.default ? slots.default() : null);
        },
    });

const InputGroupStub = SimpleStub("input-group");
const makeInputStub = (qa) =>
    defineComponent({
        name: `${qa}-stub`,
        props: ["modelValue", "id", "inputId", "type", "pt"],
        emits: ["update:modelValue", "focus", "blur"],
        setup(props, { emit, attrs }) {
            return () =>
                h("input", {
                    "data-qa": qa,
                    id: props.id,
                    "data-input-id": props.inputId,
                    "data-pt": props.pt,
                    "data-type": props.type,
                    ...attrs,
                    onFocus: () => emit("focus"),
                    onBlur: () => emit("blur"),
                });
        },
    });
const InputTextStub = makeInputStub("input-text");
const InputNumberStub = makeInputStub("input-number");
const InputOtpStub = makeInputStub("input-otp");
const InputMaskStub = makeInputStub("input-mask");

const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    props: ["for"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                { "data-qa": "widget-label", "data-for": props.for },
                slots.default ? slots.default({ class: "label-class" }) : null,
            );
    },
});

vi.mock("primevue/inputgroup", () => ({ default: InputGroupStub }));
vi.mock("primevue/inputtext", () => ({ default: InputTextStub }));
vi.mock("primevue/inputnumber", () => ({ default: InputNumberStub }));
vi.mock("primevue/inputotp", () => ({ default: InputOtpStub }));
vi.mock("primevue/inputmask", () => ({ default: InputMaskStub }));
vi.mock("@vueda/widgets/WidgetLabel.vue", async () => {
    const actual = await vi.importActual("@vueda/widgets/WidgetLabel.vue");
    return { __esModule: true, ...actual, default: WidgetLabelStub };
});

const themeFn = vi.fn((k) => `theme-${k}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: mockedUseWidgetTheme }));

const mockedUseWarningClass = vi.fn(() => "effective-pt");
vi.mock("@vueda/use/useWarningClass.js", () => ({
    PASSTHROUGH_OPTION_PROPS: {},
    useWarningClass: mockedUseWarningClass,
}));

const blur = vi.fn();
const focus = vi.fn();
const state = reactive({
    widgetId: "wid",
    combinedValue: "",
    disabled: false,
    validationState: { invalid: false },
    combinedName: "name",
    required: false,
});
const mockedUseWidget = vi.fn(() => ({ state, blur, focus }));
vi.mock("@vueda/use/useWidget.js", async () => {
    const actual = await vi.importActual("@vueda/use/useWidget.js");
    return { __esModule: true, ...actual, useWidget: mockedUseWidget };
});

let WidgetInput;

beforeEach(async () => {
    WidgetInput = (await import("@vueda/widgets/WidgetInput.vue")).default;
    mockedUseWidget.mockClear();
    themeFn.mockClear();
    mockedUseWidgetTheme.mockClear();
    mockedUseWarningClass.mockClear();
    blur.mockClear();
    focus.mockClear();
});

scopedIt.each([
    ["text", "input-text"],
    ["number", "input-number"],
    ["otp", "input-otp"],
    ["mask", "input-mask"],
    ["unknown", "input-text"],
])("uses %s input component", (type, qa) => {
    const wrapper = mount(WidgetInput, { props: { type } });
    expect(wrapper.find(`[data-qa="${qa}"]`).exists()).toBe(true);
});

scopedIt("uses InputGroup when prefix slot provided", () => {
    const wrapper = mount(WidgetInput, { slots: { prefix: "<span>p</span>" } });
    expect(wrapper.find('[data-qa="input-group"]').exists()).toBe(true);
});

scopedIt("uses InputGroup when suffix slot provided", () => {
    const wrapper = mount(WidgetInput, { slots: { suffix: "<span>s</span>" } });
    expect(wrapper.find('[data-qa="input-group"]').exists()).toBe(true);
});

scopedIt("omits InputGroup when no prefix or suffix", () => {
    const wrapper = mount(WidgetInput);
    expect(wrapper.find('[data-qa="input-group"]').exists()).toBe(false);
});

scopedIt("passes attrs except value to input", () => {
    const wrapper = mount(WidgetInput, {
        attrs: { placeholder: "here", value: "should-omit" },
    });
    const input = wrapper.get('[data-qa="input-text"]');
    expect(input.attributes("placeholder")).toBe("here");
    expect(input.attributes("value")).toBeUndefined();
});

scopedIt("sets id and input-id based on input type", () => {
    let wrapper = mount(WidgetInput, { props: { type: "text" } });
    let input = wrapper.get('[data-qa="input-text"]');
    expect(input.attributes("id")).toBe("wid");
    expect(input.attributes("data-input-id")).toBeUndefined();

    wrapper = mount(WidgetInput, { props: { type: "number" } });
    input = wrapper.get('[data-qa="input-number"]');
    expect(input.attributes("id")).toBeUndefined();
    expect(input.attributes("data-input-id")).toBe("wid");
});

scopedIt("applies theme classes and forwards focus/blur", async () => {
    const wrapper = mount(WidgetInput);
    expect(mockedUseWidgetTheme).toHaveBeenCalled();
    const root = wrapper.get('[data-qa="widget-input-root"]');
    expect(root.classes()).toContain("theme-root");

    const inner = wrapper.get('[data-qa="widget-input-inner"]');
    expect(inner.classes()).toContain("theme-inner");
    expect(inner.classes()).toContain("label-class");

    const input = wrapper.get("input");
    await input.trigger("focus");
    expect(focus).toHaveBeenCalled();
    await input.trigger("blur");
    expect(blur).toHaveBeenCalled();
});
