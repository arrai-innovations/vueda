import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

// Stubs
const BooleanDisplayStub = defineComponent({
    name: "BooleanDisplayStub",
    props: { value: null, trueLabel: String, falseLabel: String, inline: Boolean },
    setup(props) {
        return () =>
            h(
                "span",
                {
                    "data-qa": "boolean-display",
                    "data-value": String(props.value),
                    "data-true-label": String(props.trueLabel),
                    "data-false-label": String(props.falseLabel),
                    "data-inline": String(props.inline),
                },
                String(props.value),
            );
    },
});

// Mocks
const useWidget = vi.fn(() => ({
    state: reactive({
        formModelName: "fm",
        combinedValue: true,
        combinedName: "is_active",
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

vi.mock("@vueda/display/boolean-display/BooleanDisplay.vue", () => ({ default: BooleanDisplayStub }));

describe("lib/widgets/WidgetBooleanReadOnly.vue", () => {
    let WidgetBooleanReadOnly;

    const mountOptions = {
        global: {
            provide: {
                [FieldContextSymbol]: { state: { fieldId: "test-field-id" } },
            },
        },
    };

    beforeEach(async () => {
        WidgetBooleanReadOnly = (await import("@vueda/widgets/WidgetBooleanReadOnly.vue")).default;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("fills the read-only value with BooleanDisplay bound to the raw value", () => {
        const wrapper = mount(WidgetBooleanReadOnly, mountOptions);

        const display = wrapper.get('[data-qa="boolean-display"]');
        expect(display.attributes("data-value")).toBe("true");
        // The display sits inside the read-only chrome, so the row keeps its label association.
        expect(wrapper.get('[data-qa="widget-read-only-value"]').element.contains(display.element)).toBe(true);
    });

    scopedIt("renders inline, so the word sits on the row rather than below it", () => {
        const wrapper = mount(WidgetBooleanReadOnly, mountOptions);

        expect(wrapper.get('[data-qa="boolean-display"]').attributes("data-inline")).toBe("true");
    });

    scopedIt("defaults to Yes and No", () => {
        const wrapper = mount(WidgetBooleanReadOnly, mountOptions);

        const display = wrapper.get('[data-qa="boolean-display"]');
        expect(display.attributes("data-true-label")).toBe("Yes");
        expect(display.attributes("data-false-label")).toBe("No");
    });

    scopedIt("forwards custom labels to BooleanDisplay", () => {
        const wrapper = mount(WidgetBooleanReadOnly, {
            props: { trueLabel: "Enabled", falseLabel: "Disabled" },
            ...mountOptions,
        });

        const display = wrapper.get('[data-qa="boolean-display"]');
        expect(display.attributes("data-true-label")).toBe("Enabled");
        expect(display.attributes("data-false-label")).toBe("Disabled");
    });

    scopedIt("lets a consumer's own default slot replace the boolean rendering", () => {
        const wrapper = mount(WidgetBooleanReadOnly, {
            slots: { default: '<span data-qa="custom">custom</span>' },
            ...mountOptions,
        });

        expect(wrapper.find('[data-qa="boolean-display"]').exists()).toBe(false);
        expect(wrapper.get('[data-qa="custom"]').text()).toBe("custom");
    });
});
