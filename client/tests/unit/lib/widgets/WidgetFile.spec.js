import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const ControlFileUploadStub = defineComponent({
    name: "ControlFileUploadStub",
    props: ["accept", "ariaLabelledby", "ariaRequired", "disabled", "maxFileSize"],
    emits: ["update:modelValue"],
    setup(props, { attrs }) {
        return () =>
            h("div", {
                "data-qa": "file-upload",
                ...attrs,
                "data-accept": props.accept,
                "data-aria-labelledby": props.ariaLabelledby,
                "data-disabled": String(props.disabled),
                "data-aria-required": String(props.ariaRequired),
            });
    },
});
vi.mock("@vueda/controls/file-upload/FileUpload.vue", () => ({ default: ControlFileUploadStub }));

const ControlButtonStub = defineComponent({
    name: "ControlButtonStub",
    props: ["variant", "size"],
    setup(props, { attrs }) {
        return () => h("button", { "data-qa": attrs["data-qa"] || "control-button", ...attrs });
    },
});
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ControlButtonStub }));

const themeFn = vi.fn((k) => `t-${k}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: mockedUseWidgetTheme }));

let widgetState;
const mockedUseWidget = vi.fn();
vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_PROPS: {},
    WIDGET_EMITS: [],
    useWidget: mockedUseWidget,
}));

let WidgetFile, vue;

const fieldContext = {
    state: reactive({ fieldId: "test-field-id", value: undefined }),
    ignore: vi.fn(),
    removeIgnore: vi.fn(),
};
const mountOptions = {
    global: {
        provide: {
            [FieldContextSymbol]: fieldContext,
        },
    },
};

beforeEach(async () => {
    vue = await vi.importActual("vue");
    widgetState = reactive({
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
    themeFn.mockClear();
});

scopedIt("renders upload component and handles upload", async () => {
    const wrapper = mount(WidgetFile, mountOptions);
    const root = wrapper.get("div");
    expect(root.classes()).toContain("t-root");

    const inner = wrapper.get('[data-qa="widget-file-inner"]');
    expect(inner.classes()).toContain("t-inner");

    const upload = wrapper.getComponent(ControlFileUploadStub);
    expect(upload.exists()).toBe(true);

    upload.vm.$emit("update:modelValue", { name: "f.txt", url: "/f" });
    await vue.nextTick();
    expect(widgetState.combinedValue).toEqual({ name: "f.txt", url: "/f" });
});

scopedIt("shows file info and removes file", async () => {
    widgetState.combinedValue = { name: "doc.pdf", url: "/d" };
    const wrapper = mount(WidgetFile, mountOptions);

    expect(wrapper.findComponent(ControlFileUploadStub).exists()).toBe(false);
    const link = wrapper.get("a");
    expect(link.text()).toBe("doc.pdf");
    expect(link.attributes("href")).toBe("/d");

    const removeBtn = wrapper.get('[data-qa="file-remove"]');
    const downloadBtn = wrapper.get('[data-qa="file-download"]');
    expect(removeBtn.exists()).toBe(true);
    expect(downloadBtn.exists()).toBe(true);

    await removeBtn.trigger("click");
    expect(widgetState.combinedValue).toBe(null);
});

scopedIt("calls ignore for non-File objects and removeIgnore otherwise", async () => {
    const fieldState = reactive({ value: undefined });
    const ignoreFn = vi.fn();
    const removeIgnoreFn = vi.fn();
    const fc = { state: fieldState, ignore: ignoreFn, removeIgnore: removeIgnoreFn };

    mount(WidgetFile, {
        global: { provide: { [FieldContextSymbol]: fc } },
    });

    // immediate watch fires with undefined value
    expect(removeIgnoreFn).toHaveBeenCalledTimes(1);

    removeIgnoreFn.mockClear();
    fieldState.value = { a: 1 };
    await vue.nextTick();
    expect(ignoreFn).toHaveBeenCalledTimes(1);
    expect(removeIgnoreFn).not.toHaveBeenCalled();

    ignoreFn.mockClear();
    fieldState.value = new File(["x"], "x.txt");
    await vue.nextTick();
    expect(removeIgnoreFn).toHaveBeenCalledTimes(1);
    expect(ignoreFn).not.toHaveBeenCalled();
});
