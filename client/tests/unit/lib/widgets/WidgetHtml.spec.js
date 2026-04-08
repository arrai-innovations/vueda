import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { reactive } from "vue";

const themeFn = vi.fn((key) => `theme-${key}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: mockedUseWidgetTheme,
}));

/* ------------------------------------------------------------------ */
/*  Tiptap stubs                                                      */
/* ------------------------------------------------------------------ */

let editorInstance;

const chainMethods = {
    focus: vi.fn(() => chainMethods),
    toggleBold: vi.fn(() => chainMethods),
    toggleItalic: vi.fn(() => chainMethods),
    toggleUnderline: vi.fn(() => chainMethods),
    toggleStrike: vi.fn(() => chainMethods),
    toggleHeading: vi.fn(() => chainMethods),
    toggleBulletList: vi.fn(() => chainMethods),
    toggleOrderedList: vi.fn(() => chainMethods),
    toggleBlockquote: vi.fn(() => chainMethods),
    toggleCodeBlock: vi.fn(() => chainMethods),
    run: vi.fn(),
};

vi.mock("@tiptap/vue-3", async () => {
    const vue = await vi.importActual("vue");
    const EditorContent = vue.defineComponent({
        name: "EditorContent",
        props: ["editor", "id", "ariaRequired"],
        setup(props, { attrs }) {
            return () =>
                vue.h("div", {
                    ...attrs,
                    id: props.id,
                    "data-qa": attrs["data-qa"] || "widget-html-editor",
                    "aria-required": props.ariaRequired,
                    "data-stub": "editor-content",
                });
        },
    });

    return {
        EditorContent,
        useEditor: (opts) => {
            editorInstance = {
                getHTML: vi.fn(() => opts.content || ""),
                isActive: vi.fn(() => false),
                setEditable: vi.fn(),
                chain: vi.fn(() => chainMethods),
                commands: { setContent: vi.fn() },
            };
            if (opts.onUpdate) {
                editorInstance._triggerUpdate = (html) => {
                    editorInstance.getHTML.mockReturnValue(html);
                    opts.onUpdate({ editor: editorInstance });
                };
            }
            return vue.ref(editorInstance);
        },
    };
});

vi.mock("@tiptap/starter-kit", () => ({ default: {} }));
vi.mock("@tiptap/extension-underline", () => ({ default: {} }));

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

describe("lib/widgets/WidgetHtml.vue", () => {
    scopedIt("calls useWidgetTheme", () => {
        mount(WidgetHtml, { props: { modelValue: "", name: "foo" }, ...mountOptions });
        expect(mockedUseWidgetTheme).toHaveBeenCalledWith("WidgetHtml", expect.any(Object), expect.any(Object));
    });

    scopedIt("renders editor content and toolbar", () => {
        fieldContext.state.value = "init";
        const wrapper = mount(WidgetHtml, { props: { modelValue: "init", name: "bar" }, ...mountOptions });

        const root = wrapper.get("div");
        expect(root.classes()).toContain("theme-root");

        const inner = wrapper.get('[data-qa="widget-html-inner"]');
        expect(inner.classes()).toContain("theme-inner");

        expect(wrapper.find('[data-qa="widget-html-toolbar"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="widget-html-editor"]').exists()).toBe(true);
    });

    scopedIt("passes field id and aria-required to EditorContent", () => {
        fieldContext.state.required = false;
        const wrapper = mount(WidgetHtml, { props: { modelValue: "", name: "baz" }, ...mountOptions });
        const editorEl = wrapper.get('[data-qa="widget-html-editor"]');
        expect(editorEl.attributes("id")).toBe("test-field-id");
        expect(editorEl.attributes("aria-required")).toBe("false");
    });

    scopedIt("applies editorHeight as inline style", () => {
        const wrapper = mount(WidgetHtml, {
            props: { modelValue: "", name: "baz", editorHeight: "320px" },
            ...mountOptions,
        });
        const editorEl = wrapper.get('[data-qa="widget-html-editor"]');
        expect(editorEl.attributes("style")).toContain("height: 320px");
    });

    scopedIt("syncs editor content back to widgetContext on update", () => {
        fieldContext.state.value = "init";
        mount(WidgetHtml, { props: { modelValue: "init", name: "bar" }, ...mountOptions });
        editorInstance._triggerUpdate("<p>changed</p>");
        expect(fieldContext.state.value).toBe("<p>changed</p>");
    });

    scopedIt("toolbar buttons invoke editor chain commands", async () => {
        fieldContext.state.value = "";
        const wrapper = mount(WidgetHtml, { props: { modelValue: "", name: "bar" }, ...mountOptions });
        const boldButton = wrapper.get('[title="Bold"]');
        await boldButton.trigger("click");
        expect(chainMethods.focus).toHaveBeenCalled();
        expect(chainMethods.toggleBold).toHaveBeenCalled();
        expect(chainMethods.run).toHaveBeenCalled();
    });
});
