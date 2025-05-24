import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const themeFn = vi.fn((key) => `theme-${key}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: mockedUseWidgetTheme,
}));

const ptRef = { value: { root: { class: "pt" } } };
const mockedUseWarningClass = vi.fn(() => ptRef);
vi.mock("@vueda/use/useWarningClass.js", () => ({
    PASSTHROUGH_OPTION_PROPS: {},
    useWarningClass: mockedUseWarningClass,
}));

vi.mock("@vueda/widgets/WidgetLabel.vue", async () => {
    const vue = await vi.importActual("vue");
    const WidgetLabelStub = vue.defineComponent({
        name: "WidgetLabelStub",
        props: ["for"],
        setup(props, { slots }) {
            return () =>
                vue.h(
                    "label",
                    { "data-qa": "widget-label", "data-for": props.for },
                    slots.default ? slots.default({ class: "label-class" }) : null,
                );
        },
    });
    return {
        __esModule: true,
        default: WidgetLabelStub,
        WIDGET_LABEL_PROPS: {},
        getWidgetSlotsComputed: () => vue.computed(() => []),
    };
});

vi.mock("primevue/textarea", async () => {
    const vue = await vi.importActual("vue");
    const TextareaStub = vue.defineComponent({
        name: "TextareaStub",
        props: ["modelValue"],
        emits: ["update:modelValue", "blur", "focus"],
        setup(props, { emit, attrs }) {
            return () =>
                vue.h("textarea", {
                    ...attrs,
                    "data-qa": "prime-textarea",
                    value: props.modelValue,
                    onInput: (e) => emit("update:modelValue", e.target.value),
                    onBlur: () => emit("blur"),
                    onFocus: () => emit("focus"),
                });
        },
    });
    return { __esModule: true, default: TextareaStub };
});

let WidgetTextarea;

beforeEach(async () => {
    themeFn.mockClear();
    mockedUseWidgetTheme.mockClear();
    mockedUseWarningClass.mockClear();
    WidgetTextarea = (await import("@vueda/widgets/WidgetTextarea.vue")).default;
});

scopedIt("calls useWidgetTheme and useWarningClass", () => {
    mount(WidgetTextarea, { props: { modelValue: "", name: "foo" } });
    expect(mockedUseWidgetTheme).toHaveBeenCalledWith("WidgetTextarea", expect.any(Object), expect.any(Object));
    expect(mockedUseWarningClass).toHaveBeenCalled();
});

scopedIt("renders textarea and emits updates", async () => {
    const wrapper = mount(WidgetTextarea, { props: { modelValue: "init", name: "bar" } });

    const root = wrapper.get("div");
    expect(root.classes()).toContain("theme-root");

    const inner = wrapper.get('[data-qa="widget-textarea-inner"]');
    expect(inner.classes()).toContain("theme-inner");
    expect(inner.classes()).toContain("label-class");

    const textarea = wrapper.get("textarea[data-qa='prime-textarea']");
    expect(textarea.element.value).toBe("init");
    expect(textarea.attributes("name")).toBe("bar");
    expect(textarea.attributes("id")).toBeTruthy();
    expect(textarea.attributes("aria-required")).toBe("false");

    await textarea.setValue("changed");
    expect(wrapper.emitted()["update:modelValue"][0]).toEqual(["changed"]);
});
