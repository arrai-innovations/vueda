import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol, WidgetContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const themeFn = vi.fn((k) => `theme-${k}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: mockedUseWidgetTheme,
}));
vi.mock("@vueda/use/useTheme.js", () => ({ THEME_OVERRIDE_PROPS: {} }));

let popoverToggle;
const PopoverStub = defineComponent({
    name: "PopoverStub",
    setup(_, { slots, expose }) {
        popoverToggle = vi.fn();
        expose({ toggle: popoverToggle });
        return () => h("div", { "data-qa": "popover" }, slots.default ? slots.default() : null);
    },
});
const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["rounded", "severity", "size", "variant"],
    emits: ["click"],
    setup(props, { emit, slots }) {
        return () =>
            h(
                "button",
                { "data-qa": "prime-button", "data-severity": props.severity, onClick: () => emit("click") },
                slots.default ? slots.default() : null,
            );
    },
});
const FormFeedbackStub = defineComponent({
    name: "FormFeedbackStub",
    props: ["messages", "type"],
    setup(props) {
        return () =>
            h("div", {
                "data-qa": "form-feedback",
                "data-type": props.type,
                "data-messages": JSON.stringify(props.messages),
            });
    },
});
const FormHelpTextStub = defineComponent({
    name: "FormHelpTextStub",
    props: ["help"],
    setup(props) {
        return () => h("div", { "data-qa": "form-help-text", "data-help": props.help });
    },
});

vi.mock("primevue/popover", () => ({ default: PopoverStub }));
vi.mock("primevue/button", () => ({ default: ButtonStub }));
vi.mock("@vueda/components/FormFeedback.vue", () => ({ default: FormFeedbackStub }));
vi.mock("@vueda/components/FormHelpText.vue", () => ({ default: FormHelpTextStub }));

let FormHiddenFeedback, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    FormHiddenFeedback = (await import("@vueda/components/FormHiddenFeedback.vue")).default;
    mockedUseWidgetTheme.mockClear();
    themeFn.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("warns when used without context or props", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mount(FormHiddenFeedback);
    await vue.nextTick();
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(mockedUseWidgetTheme).toHaveBeenCalledWith("FormHiddenFeedback", expect.any(Object), undefined);
});

scopedIt("renders icons and feedback from context", async () => {
    const fieldCtx = { state: reactive({ help: "help", errors: { e: "err" }, messages: { w: "warn" } }) };
    const widgetCtx = { state: reactive({ validationState: { invalid: true, warning: true } }) };
    const wrapper = mount(FormHiddenFeedback, {
        global: { provide: { [FieldContextSymbol]: fieldCtx, [WidgetContextSymbol]: widgetCtx } },
    });
    await vue.nextTick();
    const root = wrapper.get('[data-qa="form-hidden-feedback-root"]');
    expect(root.exists()).toBe(true);
    const btn = root.get('[data-qa="prime-button"]');
    expect(btn.attributes("data-severity")).toBe("danger");
    expect(btn.text()).toContain("☠️");
    expect(btn.text()).toContain("⚠️");
    expect(btn.text()).toContain("ℹ️");
    const popover = wrapper.get('[data-qa="popover"]');
    expect(popover.find('[data-qa="form-feedback"][data-type="error"]').exists()).toBe(true);
    expect(popover.find('[data-qa="form-feedback"][data-type="message"]').exists()).toBe(true);
    expect(popover.find('[data-qa="form-help-text"]').exists()).toBe(true);
    expect(mockedUseWidgetTheme).toHaveBeenCalledWith("FormHiddenFeedback", expect.any(Object), widgetCtx.state);
});

scopedIt("hides button when no messages", async () => {
    const fieldCtx = { state: reactive({ help: "", errors: {}, messages: {} }) };
    const widgetCtx = { state: reactive({ validationState: { invalid: false, warning: false } }) };
    const wrapper = mount(FormHiddenFeedback, {
        global: { provide: { [FieldContextSymbol]: fieldCtx, [WidgetContextSymbol]: widgetCtx } },
    });
    await vue.nextTick();
    expect(wrapper.find('[data-qa="form-hidden-feedback-root"]').exists()).toBe(false);
});

scopedIt("toggles popover on button click", async () => {
    const fieldCtx = { state: reactive({ help: "info", errors: {}, messages: {} }) };
    const widgetCtx = { state: reactive({ validationState: { invalid: false, warning: false } }) };
    const wrapper = mount(FormHiddenFeedback, {
        global: { provide: { [FieldContextSymbol]: fieldCtx, [WidgetContextSymbol]: widgetCtx } },
    });
    await vue.nextTick();
    const btn = wrapper.get('[data-qa="prime-button"]');
    await btn.trigger("click");
    expect(popoverToggle).toHaveBeenCalled();
});
