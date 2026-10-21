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
    props: ["as", "emphasis", "size"],
    setup(props, { attrs, slots }) {
        return () =>
            h(props.as ?? "button", { "data-qa": attrs["data-qa"] || "control-button", ...attrs }, slots.default?.());
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

describe("lib/widgets/WidgetFile.vue", () => {
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

    scopedIt("opens an unsaved File via an object URL in a new tab", async () => {
        // jsdom does not implement the object-URL APIs, so define them for this test.
        const originalCreate = URL.createObjectURL;
        const originalRevoke = URL.revokeObjectURL;
        const createObjectURL = vi.fn(() => "blob:fake-url");
        const revokeObjectURL = vi.fn();
        URL.createObjectURL = createObjectURL;
        URL.revokeObjectURL = revokeObjectURL;
        try {
            const file = new File(["x"], "unsaved.txt");
            widgetState.combinedValue = file;
            const wrapper = mount(WidgetFile, mountOptions);

            const link = wrapper.get("a");
            expect(link.text()).toBe("unsaved.txt");
            expect(link.attributes("href")).toBe("blob:fake-url");
            expect(link.attributes("target")).toBe("_blank");
            expect(link.attributes("rel")).toBe("noopener");
            expect(createObjectURL).toHaveBeenCalledWith(file);

            // unmount revokes the object URL to avoid leaks
            wrapper.unmount();
            expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
        } finally {
            URL.createObjectURL = originalCreate;
            URL.revokeObjectURL = originalRevoke;
        }
    });

    scopedIt("does not set target/rel for saved files", async () => {
        widgetState.combinedValue = { name: "doc.pdf", url: "/d" };
        const wrapper = mount(WidgetFile, mountOptions);

        const link = wrapper.get("a");
        expect(link.attributes("target")).toBeUndefined();
        expect(link.attributes("rel")).toBeUndefined();
    });

    describe("Download control", () => {
        scopedIt("links a stored file's url as a download in a new tab", async () => {
            widgetState.combinedValue = { name: "uploads/doc.pdf", url: "https://example.com/media/doc.pdf" };
            const wrapper = mount(WidgetFile, mountOptions);

            const download = wrapper.get('[data-qa="file-download"]');
            expect(download.element.tagName).toBe("A");
            expect(download.attributes("href")).toBe("https://example.com/media/doc.pdf");
            expect(download.attributes("download")).toBe("");
            expect(download.attributes("target")).toBe("_blank");
            expect(download.attributes("rel")).toBe("noopener");
            expect(download.text()).toBe("Download file");
        });

        scopedIt("downloads an unsaved File through its object URL under the file's name", async () => {
            // jsdom does not implement the object-URL APIs, so define them for this test.
            const originalCreate = URL.createObjectURL;
            const originalRevoke = URL.revokeObjectURL;
            URL.createObjectURL = vi.fn(() => "blob:fake-url");
            URL.revokeObjectURL = vi.fn();
            try {
                widgetState.combinedValue = new File(["x"], "unsaved.txt");
                const wrapper = mount(WidgetFile, mountOptions);

                const download = wrapper.get('[data-qa="file-download"]');
                expect(download.element.tagName).toBe("A");
                expect(download.attributes("href")).toBe("blob:fake-url");
                expect(download.attributes("download")).toBe("unsaved.txt");
                wrapper.unmount();
            } finally {
                URL.createObjectURL = originalCreate;
                URL.revokeObjectURL = originalRevoke;
            }
        });

        scopedIt("treats a bare string value as the url", async () => {
            widgetState.combinedValue = "https://example.com/media/legacy.pdf";
            const wrapper = mount(WidgetFile, mountOptions);

            const download = wrapper.get('[data-qa="file-download"]');
            expect(download.attributes("href")).toBe("https://example.com/media/legacy.pdf");
        });

        scopedIt("hides the control when a stored file has no url", async () => {
            widgetState.combinedValue = { name: "doc.pdf", url: null };
            const wrapper = mount(WidgetFile, mountOptions);

            expect(wrapper.find('[data-qa="file-download"]').exists()).toBe(false);
            expect(wrapper.find('[data-qa="file-remove"]').exists()).toBe(true);
            const link = wrapper.get("a");
            expect(link.text()).toBe("doc.pdf");
            expect(link.attributes("href")).toBeUndefined();
        });

        scopedIt("hides the control when there is no file", async () => {
            const wrapper = mount(WidgetFile, mountOptions);

            expect(wrapper.find('[data-qa="file-download"]').exists()).toBe(false);
        });
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
});
