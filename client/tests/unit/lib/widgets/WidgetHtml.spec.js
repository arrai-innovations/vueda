import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";

const themeFn = vi.fn((key) => `theme-${key}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: mockedUseWidgetTheme,
}));

vi.mock("@vueda/widgets/WidgetLabel.vue", async () => {
    const vue = await vi.importActual("vue");
    const WidgetLabelStub = vue.defineComponent({
        name: "WidgetLabelStub",
        props: ["id"],
        setup(props, { slots }) {
            return () =>
                vue.h(
                    "label",
                    { "data-qa": "widget-label", id: props.id },
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

vi.mock("primevue/editor", async () => {
    const vue = await vi.importActual("vue");
    const EditorStub = vue.defineComponent({
        name: "EditorStub",
        props: ["modelValue", "editorStyle", "ariaRequired"],
        emits: ["update:modelValue"],
        setup(props, { emit, attrs }) {
            return () =>
                vue.h("input", {
                    ...attrs,
                    "data-qa": "prime-editor",
                    value: props.modelValue,
                    "data-editor-style": props.editorStyle,
                    "aria-required": props.ariaRequired,
                    onInput: (e) => emit("update:modelValue", e.target.value),
                });
        },
    });
    return { __esModule: true, default: EditorStub };
});

let WidgetHtml;

beforeEach(async () => {
    themeFn.mockClear();
    mockedUseWidgetTheme.mockClear();
    WidgetHtml = (await import("@vueda/widgets/WidgetHtml.vue")).default;
});

scopedIt("calls useWidgetTheme", () => {
    mount(WidgetHtml, { props: { modelValue: "", name: "foo" } });
    expect(mockedUseWidgetTheme).toHaveBeenCalledWith("WidgetHtml", expect.any(Object), expect.any(Object));
});

scopedIt("renders editor and emits updates", async () => {
    const wrapper = mount(WidgetHtml, { props: { modelValue: "init", name: "bar" } });

    const root = wrapper.get("div");
    expect(root.classes()).toContain("theme-root");

    const inner = wrapper.get('[data-qa="widget-html-inner"]');
    expect(inner.classes()).toContain("theme-inner");
    expect(inner.classes()).toContain("label-class");

    const editor = wrapper.get('input[data-qa="prime-editor"]');
    expect(editor.element.value).toBe("init");
    expect(editor.attributes("aria-required")).toBe("false");
    expect(editor.attributes("data-editor-style")).toBe("height: 320px");

    await editor.setValue("changed");
    expect(wrapper.emitted()["update:modelValue"][0]).toEqual(["changed"]);
});
