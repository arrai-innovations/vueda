import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import flushPromises from "flush-promises";
import { defineComponent, h, reactive } from "vue";

const themeFn = vi.fn((key) => `theme-${key}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: mockedUseWidgetTheme,
}));

vi.mock("@vueda/widgets/WidgetLabel.vue", async () => {
    const vue = await vi.importActual("vue");
    const WidgetLabelStub = vue.defineComponent({
        name: "WidgetLabelStub",
        setup(_, { slots }) {
            return () => (slots.default ? slots.default({}) : []);
        },
    });
    return {
        __esModule: true,
        default: WidgetLabelStub,
        WIDGET_LABEL_PROPS: {},
        getWidgetSlotsComputed: () => vue.computed(() => []),
    };
});

const widgetStub = (name) =>
    defineComponent({
        name,
        props: ["modelValue", "displayDependencies"],
        emits: ["update:modelValue"],
        setup(props) {
            return () =>
                h("div", {
                    "data-qa": name,
                    "data-deps": JSON.stringify(props.displayDependencies),
                });
        },
    });

const WidgetInputStub = widgetStub("WidgetInputStub");
const WidgetTextareaStub = widgetStub("WidgetTextareaStub");
const WidgetHtmlStub = widgetStub("WidgetHtmlStub");
vi.mock("@vueda/widgets/WidgetInput.vue", () => ({ default: WidgetInputStub }));
vi.mock("@vueda/widgets/WidgetTextarea.vue", () => ({ default: WidgetTextareaStub }));
vi.mock("@vueda/widgets/WidgetHtml.vue", () => ({ default: WidgetHtmlStub }));

describe("lib/widgets/WidgetPreviewableTemplate.vue", () => {
    let WidgetPreviewableTemplate;
    beforeEach(async () => {
        themeFn.mockClear();
        mockedUseWidgetTheme.mockClear();
        WidgetPreviewableTemplate = (await import("@vueda/widgets/WidgetPreviewableTemplate.vue")).default;
    });

    scopedIt("passes tagsKey into displayDependencies", () => {
        const fc = {
            state: reactive({ dependencyValues: {} }),
            registerDependencyValues: vi.fn(),
            unregisterDependencyValues: vi.fn(),
            setTouched: vi.fn(),
            clearTouched: vi.fn(),
            focus: vi.fn(),
            blur: vi.fn(),
        };
        const wrapper = mount(WidgetPreviewableTemplate, {
            props: { type: "input", displayDependencies: ["a"] },
            global: { provide: { [FieldContextSymbol]: fc } },
        });
        const input = wrapper.getComponent(WidgetInputStub);
        expect(JSON.parse(input.attributes("data-deps"))).toEqual(["a", "preview_tag_data"]);
    });

    scopedIt("renders preview with tag replacements and unregisters on unmount", async () => {
        const fc = {
            state: reactive({ dependencyValues: {} }),
            registerDependencyValues: vi.fn().mockReturnValue("id1"),
            unregisterDependencyValues: vi.fn(),
            setTouched: vi.fn(),
            clearTouched: vi.fn(),
            focus: vi.fn(),
            blur: vi.fn(),
        };
        fc.state.value = "Hello $name";
        const wrapper = mount(WidgetPreviewableTemplate, {
            props: { modelValue: "Hello $name" },
            global: { provide: { [FieldContextSymbol]: fc } },
        });
        expect(fc.registerDependencyValues).toHaveBeenCalledTimes(1);
        fc.state.dependencyValues.preview_tag_data = { name: "World" };
        await flushPromises();
        expect(wrapper.get('[data-qa="widget-previewable-template-preview"]').text()).toBe("Hello World");
        await wrapper.unmount();
        expect(fc.unregisterDependencyValues).toHaveBeenCalledWith("id1");
    });
});
