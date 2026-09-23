import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

// Stubs
const JsonDisplayStub = defineComponent({
    name: "JsonDisplayStub",
    props: { value: null, indent: Number, inline: Boolean },
    setup(props) {
        return () =>
            h(
                "span",
                {
                    "data-qa": "json-display",
                    "data-value": JSON.stringify(props.value ?? null),
                    "data-indent": String(props.indent),
                    "data-inline": String(props.inline),
                },
                "json",
            );
    },
});

// Mocks
const useWidget = vi.fn(() => ({
    state: reactive({
        formModelName: "fm",
        combinedValue: { thread: "M10" },
        combinedName: "specifications",
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

vi.mock("@vueda/display/json-display/JsonDisplay.vue", () => ({ default: JsonDisplayStub }));

describe("lib/widgets/WidgetJsonReadOnly.vue", () => {
    let WidgetJsonReadOnly;

    const mountOptions = {
        global: {
            provide: {
                [FieldContextSymbol]: { state: { fieldId: "test-field-id" } },
            },
        },
    };

    beforeEach(async () => {
        WidgetJsonReadOnly = (await import("@vueda/widgets/WidgetJsonReadOnly.vue")).default;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("fills the read-only value with JsonDisplay bound to the raw value", () => {
        const wrapper = mount(WidgetJsonReadOnly, mountOptions);

        const display = wrapper.get('[data-qa="json-display"]');
        expect(display.attributes("data-value")).toBe('{"thread":"M10"}');
        // The display sits inside the read-only chrome, so the row keeps its label association.
        expect(wrapper.get('[data-qa="widget-read-only-value"]').element.contains(display.element)).toBe(true);
    });

    // A read row has the room to indent, so this is the block form, unlike a list cell.
    scopedIt("renders the block form", () => {
        const wrapper = mount(WidgetJsonReadOnly, mountOptions);

        expect(wrapper.get('[data-qa="json-display"]').attributes("data-inline")).toBe("false");
    });

    scopedIt("defaults to an indent of two", () => {
        const wrapper = mount(WidgetJsonReadOnly, mountOptions);

        expect(wrapper.get('[data-qa="json-display"]').attributes("data-indent")).toBe("2");
    });

    scopedIt("forwards an indent override to JsonDisplay", () => {
        const wrapper = mount(WidgetJsonReadOnly, { props: { indent: 4 }, ...mountOptions });

        expect(wrapper.get('[data-qa="json-display"]').attributes("data-indent")).toBe("4");
    });

    scopedIt("lets a consumer's own default slot replace the JSON rendering", () => {
        const wrapper = mount(WidgetJsonReadOnly, {
            slots: { default: '<span data-qa="custom">custom</span>' },
            ...mountOptions,
        });

        expect(wrapper.find('[data-qa="json-display"]').exists()).toBe(false);
        expect(wrapper.get('[data-qa="custom"]').text()).toBe("custom");
    });
});
