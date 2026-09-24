import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

// Stubs
const DurationDisplayStub = defineComponent({
    name: "DurationDisplayStub",
    props: { value: null, format: String, inline: Boolean },
    setup(props) {
        return () =>
            h(
                "span",
                {
                    "data-qa": "duration-display",
                    "data-value": String(props.value),
                    "data-format": String(props.format),
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
        combinedValue: "730 00:00:00",
        combinedName: "expected_delivery_time",
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

vi.mock("@vueda/display/duration-display/DurationDisplay.vue", () => ({ default: DurationDisplayStub }));

describe("lib/widgets/WidgetDurationReadOnly.vue", () => {
    let WidgetDurationReadOnly;

    const mountOptions = {
        global: {
            provide: {
                [FieldContextSymbol]: { state: { fieldId: "test-field-id" } },
            },
        },
    };

    beforeEach(async () => {
        WidgetDurationReadOnly = (await import("@vueda/widgets/WidgetDurationReadOnly.vue")).default;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("fills the read-only value with DurationDisplay bound to the raw value", () => {
        const wrapper = mount(WidgetDurationReadOnly, mountOptions);

        const display = wrapper.get('[data-qa="duration-display"]');
        expect(display.attributes("data-value")).toBe("730 00:00:00");
        // The display sits inside the read-only chrome, so the row keeps its label association.
        expect(wrapper.get('[data-qa="widget-read-only-value"]').element.contains(display.element)).toBe(true);
    });

    scopedIt("renders inline, so the units sit on the row rather than below it", () => {
        const wrapper = mount(WidgetDurationReadOnly, mountOptions);

        expect(wrapper.get('[data-qa="duration-display"]').attributes("data-inline")).toBe("true");
    });

    scopedIt("defaults to the long format", () => {
        const wrapper = mount(WidgetDurationReadOnly, mountOptions);

        expect(wrapper.get('[data-qa="duration-display"]').attributes("data-format")).toBe("long");
    });

    scopedIt("forwards a format override to DurationDisplay", () => {
        const wrapper = mount(WidgetDurationReadOnly, { props: { format: "short" }, ...mountOptions });

        expect(wrapper.get('[data-qa="duration-display"]').attributes("data-format")).toBe("short");
    });

    scopedIt("lets a consumer's own default slot replace the duration rendering", () => {
        const wrapper = mount(WidgetDurationReadOnly, {
            slots: { default: '<span data-qa="custom">custom</span>' },
            ...mountOptions,
        });

        expect(wrapper.find('[data-qa="duration-display"]').exists()).toBe(false);
        expect(wrapper.get('[data-qa="custom"]').text()).toBe("custom");
    });
});
