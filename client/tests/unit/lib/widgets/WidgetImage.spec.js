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

const ControlButtonStub = defineComponent({
    name: "ControlButtonStub",
    props: ["variant", "size"],
    emits: ["click"],
    setup(props, { emit, attrs }) {
        return () => h("button", { "data-qa": attrs["data-qa"] || "control-button", onClick: () => emit("click") });
    },
});
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ControlButtonStub }));

const ControlFileUploadStub = defineComponent({
    name: "ControlFileUploadStub",
    emits: ["update:modelValue"],
    props: ["accept", "ariaLabelledby", "disabled", "maxFileSize", "ariaRequired"],
    setup(props, { attrs }) {
        return () => h("div", { "data-qa": "file-upload", ...attrs });
    },
});
vi.mock("@vueda/controls/file-upload/FileUpload.vue", () => ({ default: ControlFileUploadStub }));

let WidgetImage;

const defaultFieldContext = {
    state: reactive({ fieldId: "test-field-id", value: undefined }),
    ignore: vi.fn(),
    removeIgnore: vi.fn(),
};
const mountOptions = {
    global: {
        provide: {
            [FieldContextSymbol]: defaultFieldContext,
        },
    },
};

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
        const wrapper = mount(WidgetImage, mountOptions);
        const root = wrapper.get("div");
        expect(root.classes()).toContain("t-root");
        const inner = wrapper.get('[data-qa="widget-image-inner"]');
        expect(inner.classes()).toContain("t-inner");
        const fu = wrapper.getComponent(ControlFileUploadStub);
        expect(fu.exists()).toBe(true);
        fu.vm.$emit("update:modelValue", "img");
        await nextTick();
        expect(widgetContext.state.combinedValue).toBe("img");
    });

    scopedIt("shows image when value present and removes on click", async () => {
        const wrapper = mount(WidgetImage, mountOptions);
        widgetContext.state.combinedValue = "url";
        await nextTick();
        const img = wrapper.get('[data-qa="image-preview"]');
        expect(img.attributes("src")).toBe("url");
        expect(img.attributes("width")).toBe("250");
        const btn = wrapper.get('[data-qa="image-remove"]');
        await btn.trigger("click");
        await nextTick();
        expect(widgetContext.state.combinedValue).toBe(null);
        expect(wrapper.findComponent(ControlFileUploadStub).exists()).toBe(true);
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
