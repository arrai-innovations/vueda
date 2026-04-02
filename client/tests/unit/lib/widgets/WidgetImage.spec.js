import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, nextTick, reactive } from "vue";

const themeFn = vi.fn((k) => `t-${k}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: mockedUseWidgetTheme,
}));

let widgetContext;
const mockedUseWidget = vi.fn(() => {
    widgetContext = {
        state: reactive({
            widgetId: "wid",
            combinedValue: null,
            disabled: false,
            required: false,
        }),
        focus: vi.fn(),
        blur: vi.fn(),
    };
    return widgetContext;
});
vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_EMITS: [],
    WIDGET_PROPS: {},
    useWidget: mockedUseWidget,
}));

const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    props: ["id", "labelTag"],
    setup(props, { slots }) {
        return () =>
            h(
                "label",
                { "data-qa": "widget-label", id: props.id },
                slots.default ? slots.default({ class: "lbl" }) : null,
            );
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

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["icon"],
    emits: ["click"],
    setup(props, { emit }) {
        return () => h("button", { "data-qa": "button", "data-icon": props.icon, onClick: () => emit("click") });
    },
});
vi.mock("primevue/button", () => ({ default: ButtonStub }));

const ImageStub = defineComponent({
    name: "ImageStub",
    props: ["src"],
    setup(props) {
        return () => h("img", { "data-qa": "image", src: props.src });
    },
});
vi.mock("primevue/image", () => ({ default: ImageStub }));

const FileUploadStub = defineComponent({
    name: "FileUploadStub",
    emits: ["uploader"],
    props: ["ariaLabelledby", "disabled", "maxFileSize", "mode", "name", "accept", "ariaRequired"],
    setup(props, { attrs }) {
        return () => h("div", { "data-qa": "file-upload", ...attrs });
    },
});
vi.mock("primevue/fileupload", () => ({ default: FileUploadStub }));

let WidgetImage;

beforeEach(async () => {
    WidgetImage = (await import("@vueda/widgets/WidgetImage.vue")).default;
    mockedUseWidget.mockClear();
    mockedUseWidgetTheme.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/widgets/WidgetImage.vue", () => {
    scopedIt("renders upload control and updates value on upload", async () => {
        const wrapper = mount(WidgetImage);
        const root = wrapper.get("div");
        expect(root.classes()).toContain("t-root");
        const inner = wrapper.get('[data-qa="widget-image-inner"]');
        expect(inner.classes()).toContain("t-inner");
        expect(inner.classes()).toContain("lbl");
        const fu = wrapper.getComponent(FileUploadStub);
        expect(fu.exists()).toBe(true);
        fu.vm.$emit("uploader", { files: ["img"] });
        await nextTick();
        expect(widgetContext.state.combinedValue).toBe("img");
    });

    scopedIt("shows image when value present and removes on click", async () => {
        const wrapper = mount(WidgetImage);
        widgetContext.state.combinedValue = "url";
        await nextTick();
        const img = wrapper.getComponent(ImageStub);
        expect(img.props("src")).toBe("url");
        const btn = wrapper.getComponent(ButtonStub);
        await btn.trigger("click");
        await nextTick();
        expect(widgetContext.state.combinedValue).toBe(null);
        expect(wrapper.findComponent(FileUploadStub).exists()).toBe(true);
    });

    scopedIt("calls ignore for string values and removeIgnore otherwise", async () => {
        const fieldState = reactive({ value: undefined });
        const ignoreFn = vi.fn();
        const removeIgnoreFn = vi.fn();
        const fc = { state: fieldState, ignore: ignoreFn, removeIgnore: removeIgnoreFn };

        mount(WidgetImage, {
            global: { provide: { [FieldContextSymbol]: fc } },
        });

        // immediate watch fires with undefined value
        expect(removeIgnoreFn).toHaveBeenCalledTimes(1);

        removeIgnoreFn.mockClear();
        fieldState.value = "abc";
        await nextTick();
        expect(ignoreFn).toHaveBeenCalledTimes(1);
        expect(removeIgnoreFn).not.toHaveBeenCalled();

        ignoreFn.mockClear();
        fieldState.value = { src: "img.jpg" };
        await nextTick();
        expect(removeIgnoreFn).toHaveBeenCalledTimes(1);
        expect(ignoreFn).not.toHaveBeenCalled();
    });
});
