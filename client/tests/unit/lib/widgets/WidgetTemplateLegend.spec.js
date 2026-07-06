import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const themeFn = vi.fn((key) => `theme-${key}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({
    useWidgetTheme: mockedUseWidgetTheme,
}));

const ClickToCopyTextStub = defineComponent({
    name: "ClickToCopyTextStub",
    props: ["text"],
    setup(props) {
        return () => h("span", { "data-qa": "click-to-copy", "data-text": props.text });
    },
});
vi.mock("@vueda/display/click-to-copy-text/ClickToCopyText.vue", () => ({ default: ClickToCopyTextStub }));

describe("lib/widgets/WidgetTemplateLegend.vue", () => {
    let WidgetTemplateLegend;
    beforeEach(async () => {
        themeFn.mockClear();
        mockedUseWidgetTheme.mockClear();
        WidgetTemplateLegend = (await import("@vueda/widgets/WidgetTemplateLegend.vue")).default;
    });

    scopedIt("renders tags with copy-to-clipboard text", () => {
        const testValue = {
            name: { description: "Name" },
            city: { description: "City" },
        };
        const wrapper = mount(WidgetTemplateLegend, {
            props: {
                modelValue: testValue,
            },
            global: {
                provide: {
                    [FieldContextSymbol]: {
                        state: reactive({
                            fieldId: "test-field-id",
                            dependencyValues: {},
                            value: testValue,
                            required: false,
                            errors: {},
                            name: "tags",
                        }),
                        registerDependencyValues: vi.fn(),
                        unregisterDependencyValues: vi.fn(),
                        setTouched: vi.fn(),
                        clearTouched: vi.fn(),
                        focus: vi.fn(),
                        blur: vi.fn(),
                    },
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
