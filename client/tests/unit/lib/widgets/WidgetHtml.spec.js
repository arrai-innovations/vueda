import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { reactive } from "vue";

const themeFn = vi.fn((key) => `theme-${key}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: mockedUseWidgetTheme,
}));

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

const fieldContext = {
    state: reactive({
        fieldId: "test-field-id",
        dependencyValues: {},
        value: undefined,
        required: false,
        errors: {},
        name: "html",
    }),
    registerDependencyValues: vi.fn(),
    unregisterDependencyValues: vi.fn(),
    setTouched: vi.fn(),
    clearTouched: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn(),
};

let WidgetHtml;

beforeEach(async () => {
    themeFn.mockClear();
    mockedUseWidgetTheme.mockClear();
    WidgetHtml = (await import("@vueda/widgets/WidgetHtml.vue")).default;
});

const mountOptions = {
    global: {
        provide: {
            [FieldContextSymbol]: fieldContext,
        },
    },
};

scopedIt("calls useWidgetTheme", () => {
    mount(WidgetHtml, { props: { modelValue: "", name: "foo" }, ...mountOptions });
    expect(mockedUseWidgetTheme).toHaveBeenCalledWith("WidgetHtml", expect.any(Object), expect.any(Object));
});

scopedIt("renders editor and emits updates", async () => {
    fieldContext.state.value = "init";
    const wrapper = mount(WidgetHtml, { props: { modelValue: "init", name: "bar" }, ...mountOptions });

    const root = wrapper.get("div");
    expect(root.classes()).toContain("theme-root");

    const inner = wrapper.get('[data-qa="widget-html-inner"]');
    expect(inner.classes()).toContain("theme-inner");

    const editor = wrapper.get('input[data-qa="prime-editor"]');
    expect(editor.element.value).toBe("init");
    expect(editor.attributes("id")).toBe("test-field-id");
    expect(editor.attributes("aria-required")).toBe("false");
    expect(editor.attributes("data-editor-style")).toBe("height: auto;");

    await editor.setValue("changed");
    expect(fieldContext.state.value).toBe("changed");
});
