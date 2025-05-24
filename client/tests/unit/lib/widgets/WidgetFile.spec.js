import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const FileUploadStub = defineComponent({
    name: "FileUploadStub",
    props: ["pt", "ariaLabelledby", "disabled", "invalid", "name", "ariaRequired"],
    emits: ["uploader"],
    setup(props, { attrs }) {
        return () =>
            h("div", {
                "data-qa": "file-upload",
                ...attrs,
                "data-pt": props.pt,
                "data-aria-labelledby": props.ariaLabelledby,
                "data-disabled": String(props.disabled),
                "data-invalid": String(props.invalid),
                "data-name": props.name,
                "data-aria-required": String(props.ariaRequired),
            });
    },
});
vi.mock("primevue/fileupload", () => ({ default: FileUploadStub }));

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["icon"],
    setup(props, { attrs }) {
        return () => h("button", { "data-qa": "prime-button", "data-icon": props.icon, ...attrs });
    },
});
vi.mock("primevue/button", () => ({ default: ButtonStub }));

const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    props: ["id", "labelTag"],
    setup(_, { slots }) {
        return () => h("label", { "data-qa": "widget-label" }, slots.default ? slots.default({ class: "lbl" }) : null);
    },
});
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    __esModule: true,
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS: {},
    getWidgetSlotsComputed: () => () => [],
}));

const themeFn = vi.fn((k) => `t-${k}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: mockedUseWidgetTheme }));

const mockedUseWarningClass = vi.fn(() => "pt-class");
vi.mock("@vueda/use/useWarningClass.js", () => ({
    PASSTHROUGH_OPTION_PROPS: {},
    useWarningClass: mockedUseWarningClass,
}));

let widgetState;
const mockedUseWidget = vi.fn();
vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_PROPS: {},
    WIDGET_EMITS: [],
    useWidget: mockedUseWidget,
}));

let WidgetFile, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    widgetState = reactive({
        widgetId: "wid",
        combinedValue: null,
        disabled: false,
        validationState: reactive({ invalid: false }),
        required: false,
        combinedName: "name",
    });
    mockedUseWidget.mockReturnValue({ state: widgetState });
    WidgetFile = (await import("@vueda/widgets/WidgetFile.vue")).default;
    mockedUseWidget.mockClear();
    mockedUseWidgetTheme.mockClear();
    mockedUseWarningClass.mockClear();
    themeFn.mockClear();
});

scopedIt("renders upload component and handles upload", async () => {
    const wrapper = mount(WidgetFile, { attrs: { foo: "bar", value: "v" } });
    const root = wrapper.get("div");
    expect(root.classes()).toContain("t-root");

    const inner = wrapper.get('[data-qa="widget-file-inner"]');
    expect(inner.classes()).toContain("t-inner");
    expect(inner.classes()).toContain("lbl");

    const upload = wrapper.getComponent(FileUploadStub);
    expect(upload.attributes("foo")).toBe("bar");
    expect(upload.attributes("value")).toBeUndefined();

    const file = { name: "f.txt", objectURL: "/f" };
    upload.vm.$emit("uploader", { files: [file] });
    await vue.nextTick();
    expect(widgetState.combinedValue).toEqual(file);
});

scopedIt("shows file info and removes file", async () => {
    widgetState.combinedValue = { name: "doc.pdf", objectURL: "/d" };
    const wrapper = mount(WidgetFile);

    expect(wrapper.findComponent(FileUploadStub).exists()).toBe(false);
    const link = wrapper.get("a");
    expect(link.text()).toBe("doc.pdf");
    expect(link.attributes("href")).toBe("/d");

    const buttons = wrapper.findAll('[data-qa="prime-button"]');
    expect(buttons.length).toBe(2);
    await buttons[0].trigger("click");
    expect(widgetState.combinedValue).toBe(null);
});
