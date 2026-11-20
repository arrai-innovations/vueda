import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

// Stubs
const EmailDisplayStub = defineComponent({
    name: "EmailDisplayStub",
    props: { value: null, inline: Boolean },
    setup(props) {
        return () => h("span", { "data-qa": "display", "data-inline": String(props.inline) }, String(props.value));
    },
});

// Mocks
const widgetState = reactive({ formModelName: "fm", combinedValue: "sales@domain.invalid", combinedName: "contact" });
const useWidget = vi.fn(() => ({ state: widgetState }));
vi.mock("@vueda/use/useWidget.js", () => ({ WIDGET_EMITS: [], WIDGET_PROPS: {}, useWidget }));
const useWidgetTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme }));
const useModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig }));
const useResolvedLookupObject = vi.fn();
vi.mock("@vueda/use/useResolvedLookupObject.js", () => ({ useResolvedLookupObject }));
const useSlotNameResolver = vi.fn(() => ({ name: undefined, exists: undefined }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver }));

vi.mock("@vueda/display/email-display/EmailDisplay.vue", () => ({ default: EmailDisplayStub }));

describe("lib/widgets/WidgetEmailReadOnly.vue", () => {
    let WidgetEmailReadOnly;

    const mountOptions = {
        global: {
            provide: {
                [FieldContextSymbol]: { state: { fieldId: "test-field-id" } },
            },
        },
    };

    beforeEach(async () => {
        widgetState.combinedValue = "sales@domain.invalid";
        WidgetEmailReadOnly = (await import("@vueda/widgets/WidgetEmailReadOnly.vue")).default;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("fills the read-only value with EmailDisplay bound to the raw value", () => {
        const wrapper = mount(WidgetEmailReadOnly, mountOptions);

        const display = wrapper.get('[data-qa="display"]');
        expect(display.text()).toBe("sales@domain.invalid");
        expect(display.attributes("data-inline")).toBe("true");
        // The display sits inside the read-only chrome, so the row keeps its label association.
        expect(wrapper.get('[data-qa="widget-read-only-value"]').element.contains(display.element)).toBe(true);
    });

    scopedIt("passes an empty value to EmailDisplay, which renders the dash", () => {
        widgetState.combinedValue = null;
        const wrapper = mount(WidgetEmailReadOnly, mountOptions);

        expect(wrapper.get('[data-qa="display"]').text()).toBe("null");
    });

    scopedIt("keeps the plain read-only rendering for an array from a many-valued field", () => {
        widgetState.combinedValue = ["sales@domain.invalid"];
        const wrapper = mount(WidgetEmailReadOnly, mountOptions);

        expect(wrapper.find('[data-qa="display"]').exists()).toBe(false);
        expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toContain("sales@domain.invalid");
    });

    scopedIt("keeps the plain read-only rendering when the value shows as a choice label", () => {
        const wrapper = mount(WidgetEmailReadOnly, {
            props: { options: [{ value: "sales@domain.invalid", label: "Sales" }] },
            ...mountOptions,
        });

        expect(wrapper.find('[data-qa="display"]').exists()).toBe(false);
        expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("Sales");
    });

    scopedIt("lets a consumer's own default slot replace the link rendering", () => {
        const wrapper = mount(WidgetEmailReadOnly, {
            slots: { default: '<span data-qa="custom">custom</span>' },
            ...mountOptions,
        });

        expect(wrapper.find('[data-qa="display"]').exists()).toBe(false);
        expect(wrapper.get('[data-qa="custom"]').text()).toBe("custom");
    });
});
