import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

// Stubs
const DateTimeDisplayStub = defineComponent({
    name: "DateTimeDisplayStub",
    props: ["value", "format", "showTime", "showRelative", "showTooltip", "tooltipFormat"],
    setup(props) {
        return () =>
            h(
                "span",
                {
                    "data-qa": "date-time-display",
                    "data-value": String(props.value),
                    "data-format": String(props.format),
                    "data-show-time": String(props.showTime),
                    "data-show-relative": String(props.showRelative),
                    "data-show-tooltip": String(props.showTooltip),
                },
                String(props.value),
            );
    },
});

// Mocks
const useWidget = vi.fn(() => ({
    state: reactive({
        formModelName: "fm",
        combinedValue: "2026-08-25T17:21:56.906248Z",
        combinedName: "updated_at",
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

vi.mock("@vueda/display/date-display/DateTimeDisplay.vue", () => ({ default: DateTimeDisplayStub }));

describe("lib/widgets/WidgetDateTimeReadOnly.vue", () => {
    let WidgetDateTimeReadOnly;

    const mountOptions = {
        global: {
            provide: {
                [FieldContextSymbol]: { state: { fieldId: "test-field-id" } },
            },
        },
    };

    beforeEach(async () => {
        WidgetDateTimeReadOnly = (await import("@vueda/widgets/WidgetDateTimeReadOnly.vue")).default;
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("fills the read-only value with DateTimeDisplay bound to the raw value", () => {
        const wrapper = mount(WidgetDateTimeReadOnly, mountOptions);

        const display = wrapper.get('[data-qa="date-time-display"]');
        expect(display.attributes("data-value")).toBe("2026-08-25T17:21:56.906248Z");
        // The display sits inside the read-only chrome, so the row keeps its label association.
        expect(wrapper.get('[data-qa="widget-read-only-value"]').element.contains(display.element)).toBe(true);
    });

    scopedIt("forwards its display options to DateTimeDisplay", () => {
        const wrapper = mount(WidgetDateTimeReadOnly, {
            props: { format: "t", showTime: false, showRelative: false, showTooltip: false },
            ...mountOptions,
        });

        const display = wrapper.get('[data-qa="date-time-display"]');
        expect(display.attributes("data-format")).toBe("t");
        expect(display.attributes("data-show-time")).toBe("false");
        expect(display.attributes("data-show-relative")).toBe("false");
        expect(display.attributes("data-show-tooltip")).toBe("false");
    });

    scopedIt("defaults to the same options the list column adapter uses", () => {
        const wrapper = mount(WidgetDateTimeReadOnly, mountOptions);

        const display = wrapper.get('[data-qa="date-time-display"]');
        expect(display.attributes("data-format")).toBe("absolute");
        expect(display.attributes("data-show-time")).toBe("true");
    });

    scopedIt("lets a consumer's own default slot replace the date rendering", () => {
        const wrapper = mount(WidgetDateTimeReadOnly, {
            slots: { default: '<span data-qa="custom">custom</span>' },
            ...mountOptions,
        });

        expect(wrapper.find('[data-qa="date-time-display"]').exists()).toBe(false);
        expect(wrapper.get('[data-qa="custom"]').text()).toBe("custom");
    });
});
