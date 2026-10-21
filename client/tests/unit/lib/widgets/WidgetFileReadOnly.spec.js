import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

// Stubs
const FileDisplayStub = defineComponent({
    name: "FileDisplayStub",
    props: { value: null, inline: Boolean },
    setup(props) {
        return () =>
            h(
                "span",
                {
                    "data-qa": "file-display",
                    "data-url": String(props.value?.url),
                    "data-inline": String(props.inline),
                },
                String(props.value?.name),
            );
    },
});

// Mocks
const useWidget = vi.fn(() => ({
    state: reactive({
        formModelName: "fm",
        combinedValue: { name: "manuals/guide.pdf", url: "https://files.domain.invalid/manuals/guide.pdf" },
        combinedName: "manual",
    }),
}));
vi.mock("@vueda/use/useWidget.js", () => ({ WIDGET_EMITS: [], WIDGET_PROPS: {}, useWidget }));
const useWidgetTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme }));
const useModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig }));
const useResolvedLookupObject = vi.fn();
vi.mock("@vueda/use/useResolvedLookupObject.js", () => ({ useResolvedLookupObject }));
const useSlotNameResolver = vi.fn(() => ({ name: undefined, exists: undefined }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver }));

vi.mock("@vueda/display/file-display/FileDisplay.vue", () => ({ default: FileDisplayStub }));

describe("lib/widgets/WidgetFileReadOnly.vue", () => {
    let WidgetFileReadOnly;

    const mountOptions = {
        global: {
            provide: {
                [FieldContextSymbol]: { state: { fieldId: "test-field-id" } },
            },
        },
    };

    beforeEach(async () => {
        WidgetFileReadOnly = (await import("@vueda/widgets/WidgetFileReadOnly.vue")).default;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("fills the read-only value with FileDisplay bound to the raw value", () => {
        const wrapper = mount(WidgetFileReadOnly, mountOptions);

        const display = wrapper.get('[data-qa="file-display"]');
        expect(display.attributes("data-url")).toBe("https://files.domain.invalid/manuals/guide.pdf");
        expect(display.text()).toBe("manuals/guide.pdf");
        // The display sits inside the read-only chrome, so the row keeps its label association.
        expect(wrapper.get('[data-qa="widget-read-only-value"]').element.contains(display.element)).toBe(true);
    });

    scopedIt("renders inline, so the link sits on the row rather than below it", () => {
        const wrapper = mount(WidgetFileReadOnly, mountOptions);

        expect(wrapper.get('[data-qa="file-display"]').attributes("data-inline")).toBe("true");
    });

    scopedIt("lets a consumer's own default slot replace the file rendering", () => {
        const wrapper = mount(WidgetFileReadOnly, {
            slots: { default: '<span data-qa="custom">custom</span>' },
            ...mountOptions,
        });

        expect(wrapper.find('[data-qa="file-display"]').exists()).toBe(false);
        expect(wrapper.get('[data-qa="custom"]').text()).toBe("custom");
    });
});
