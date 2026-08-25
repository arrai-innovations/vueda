import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive, ref } from "vue";

// Stubs
const LinkModelViewStub = defineComponent({
    name: "LinkModelViewStub",
    props: ["app", "model", "pk", "view", "label"],
    setup(props) {
        return () =>
            h(
                "a",
                {
                    "data-qa": "link-model-view",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-pk": String(props.pk),
                    "data-view": props.view,
                    "data-label": props.label,
                },
                props.label,
            );
    },
});

// Mocks
const useWidget = vi.fn(() => ({
    state: reactive({ formModelName: "fm", combinedValue: "val", combinedName: "field" }),
}));
vi.mock("@vueda/use/useWidget.js", () => ({ WIDGET_EMITS: [], WIDGET_PROPS: {}, useWidget }));
const useWidgetTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme }));
const useModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig }));
const useResolvedLookupObject = vi.fn();
vi.mock("@vueda/use/useResolvedLookupObject.js", () => ({ useResolvedLookupObject }));
const useIsActive = vi.fn(() => ref(true));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive }));
const useSlotNameResolver = vi.fn(() => ({ name: ref("n"), exists: ref(false) }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver }));

vi.mock("@vueda/navigation/link-model-view/LinkModelView.vue", () => ({ default: LinkModelViewStub }));

describe("lib/widgets/WidgetReadOnly.vue", () => {
    let WidgetReadOnly;

    const fieldContext = { state: { fieldId: "test-field-id" } };
    const mountOptions = {
        global: {
            provide: {
                [FieldContextSymbol]: fieldContext,
            },
        },
    };

    beforeEach(async () => {
        WidgetReadOnly = (await import("@vueda/widgets/WidgetReadOnly.vue")).default;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("renders text item when not in lookup mode", () => {
        const wrapper = mount(WidgetReadOnly, {
            props: { prefix: "P", suffix: "S" },
            ...mountOptions,
        });
        const value = wrapper.get('[data-qa="widget-read-only-value"]');
        expect(value.text()).toContain("P");
        expect(value.text()).toContain("val");
        expect(value.text()).toContain("S");
        expect(wrapper.find('[data-qa="link-model-view"]').exists()).toBe(false);
    });

    scopedIt("renders the label for a static choice value", () => {
        useWidget.mockReturnValueOnce({
            state: reactive({ formModelName: "fm", combinedValue: "enterprise", combinedName: "tier" }),
        });

        const wrapper = mount(WidgetReadOnly, {
            props: {
                options: [
                    { label: "Trial", value: "trial" },
                    { label: "Enterprise", value: "enterprise" },
                ],
            },
            ...mountOptions,
        });

        expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("Enterprise");
    });

    scopedIt("passes mapped and raw values to the default slot", () => {
        useWidget.mockReturnValueOnce({
            state: reactive({ formModelName: "fm", combinedValue: "enterprise", combinedName: "tier" }),
        });

        const wrapper = mount(WidgetReadOnly, {
            props: {
                options: [{ label: "Enterprise", value: "enterprise" }],
            },
            slots: {
                default: ({ rawValue, value }) => h("span", { "data-qa": "slot-value" }, `${value}/${rawValue}`),
            },
            ...mountOptions,
        });

        expect(wrapper.get('[data-qa="slot-value"]').text()).toBe("Enterprise/enterprise");
    });

    scopedIt("uses custom choice label and value keys with string-normalized matching", () => {
        useWidget.mockReturnValueOnce({
            state: reactive({ formModelName: "fm", combinedValue: false, combinedName: "taxExempt" }),
        });

        const wrapper = mount(WidgetReadOnly, {
            props: {
                optionLabel: "display",
                optionValue: "code",
                options: [
                    { display: "Yes", code: "true" },
                    { display: "No", code: "False" },
                ],
            },
            ...mountOptions,
        });

        expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("No");
    });

    scopedIt("renders joined labels for many static choice values", () => {
        useWidget.mockReturnValueOnce({
            state: reactive({ formModelName: "fm", combinedValue: ["usd", "eur"], combinedName: "currency" }),
        });

        const wrapper = mount(WidgetReadOnly, {
            props: {
                options: [
                    { label: "USD", value: "usd" },
                    { label: "EUR", value: "eur" },
                ],
            },
            ...mountOptions,
        });

        expect(wrapper.get('[data-qa="widget-read-only-value"]').text()).toBe("USD, EUR");
    });

    scopedIt("renders link when lookup mode and value available", () => {
        const lookup = reactive({
            object: { id: 1, formatted_name: "One" },
            loading: false,
            error: null,
            errored: false,
            effectScope: { stop: vi.fn() },
        });
        useModelConfig.mockReturnValue({ info: { pk: "id" }, config: { fetchFields: [], expand: [] } });
        useResolvedLookupObject.mockReturnValue(lookup);
        const wrapper = mount(WidgetReadOnly, {
            props: { app: "a", model: "m", prefix: "<", suffix: ">" },
            ...mountOptions,
        });
        const link = wrapper.get('[data-qa="link-model-view"]');
        expect(link.attributes("data-app")).toBe("a");
        expect(link.attributes("data-model")).toBe("m");
        expect(link.attributes("data-pk")).toBe("1");
        expect(link.attributes("data-label")).toBe("One");
        expect(link.text()).toBe("One");
        const value = wrapper.get('[data-qa="widget-read-only-value"]');
        expect(value.text()).toContain("<");
        expect(value.text()).toContain(">");
    });
});
