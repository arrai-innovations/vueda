import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const themeFn = vi.fn((key) => `theme-${key}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: mockedUseWidgetTheme,
}));

vi.mock("@vueda/widgets/WidgetLabel.vue", async () => {
    const vue = await vi.importActual("vue");
    const WidgetLabelStub = vue.defineComponent({
        name: "WidgetLabelStub",
        props: ["id", "for"],
        setup(props, { slots }) {
            return () =>
                vue.h(
                    "label",
                    { "data-qa": "widget-label", id: props.id, for: props.for },
                    slots.default ? slots.default({ class: "label-class" }) : [],
                );
        },
    });
    return {
        __esModule: true,
        default: WidgetLabelStub,
        WIDGET_LABEL_PROPS: {},
        getWidgetSlotsComputed: () => vue.computed(() => []),
    };
});

const ClickToCopyTextStub = defineComponent({
    name: "ClickToCopyTextStub",
    props: ["text"],
    setup(props) {
        return () => h("span", { "data-qa": "click-to-copy", "data-text": props.text });
    },
});
vi.mock("@vueda/components/ClickToCopyText.vue", () => ({ default: ClickToCopyTextStub }));

describe("lib/widgets/WidgetTemplateLegend.vue", () => {
    let WidgetTemplateLegend;
    beforeEach(async () => {
        themeFn.mockClear();
        mockedUseWidgetTheme.mockClear();
        WidgetTemplateLegend = (await import("@vueda/widgets/WidgetTemplateLegend.vue")).default;
    });

    scopedIt("renders tags with copy-to-clipboard text", () => {
        const wrapper = mount(WidgetTemplateLegend, {
            props: {
                modelValue: {
                    name: { description: "Name" },
                    city: { description: "City" },
                },
            },
        });
        const items = wrapper.findAll('[data-qa="widget-template-legend-list-item"]');
        expect(items).toHaveLength(2);
        expect(items[0].text()).toContain("Name:");
        const copy = items[0].get('[data-qa="click-to-copy"]');
        expect(copy.attributes("data-text")).toBe("$name");
    });
});
