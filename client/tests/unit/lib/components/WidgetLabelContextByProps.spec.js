import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive, ref } from "vue";

// Stub for WidgetLabel so we can inspect passed props and slots
const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    props: ["label", "help", "required", "invalid", "readOnly", "skipFeedback"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "widget-label",
                    "data-label": props.label,
                    "data-help": props.help,
                    "data-required": String(props.required),
                    "data-invalid": String(props.invalid),
                    "data-read-only": String(props.readOnly),
                    "data-skip-feedback": String(props.skipFeedback),
                },
                Object.keys(slots).map((n) => (slots[n] ? slots[n]() : null)),
            );
    },
});
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS: {
        label: String,
        help: String,
        required: Boolean,
        invalid: Boolean,
        readOnly: Boolean,
    },
    getWidgetSlotsComputed: () => () => [],
}));

// Mock composables used by the component
const headerProps = {
    label: ref("Header"),
    help: ref("Help"),
    required: ref(true),
    invalid: ref(false),
    readOnly: ref(false),
};
const mockedUseFieldSetTabularHeaderProps = vi.fn(() => headerProps);
vi.mock("@vueda/use/useFieldSetTabularHeaderProps.js", () => ({
    useFieldSetTabularHeaderProps: mockedUseFieldSetTabularHeaderProps,
}));

const mockedUseWidget = vi.fn(() => ({ state: reactive({}) }));
vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_PROPS: {},
    WIDGET_EMITS: [],
    useWidget: mockedUseWidget,
}));

let WidgetLabelContextByProps;

beforeEach(async () => {
    // WidgetLabelContextByProps = (await import("@vueda/components/WidgetLabelContextByProps.vue")).default;
    mockedUseFieldSetTabularHeaderProps.mockClear();
    mockedUseWidget.mockClear();
});

describe("lib/components/WidgetLabelContextByProps.vue", () => {
    scopedIt("uses header props from composable", () => {
        const formModel = {};
        const formContext = { state: {} };
        const wrapper = mount(WidgetLabelContextByProps, {
            props: { fieldSetTabularInline: { formModel }, fieldValuePath: "path" },
            attrs: { field: { name: "fieldName" } },
            global: { provide: { [FormContextSymbol]: formContext } },
        });

        expect(mockedUseFieldSetTabularHeaderProps).toHaveBeenCalled();
        const args = mockedUseFieldSetTabularHeaderProps.mock.calls[0];
        expect(args[0]).toStrictEqual(formModel);
        expect(args[1]).toBe(formContext);
        expect(args[2].value).toBe("fieldName");
        expect(args[3].value).toBe("path");

        const widgetArgs = mockedUseWidget.mock.calls[0][0];
        expect(widgetArgs.contextless).toBe(true);
        expect(widgetArgs.name).toBe("path");
        expect(widgetArgs.label).toBe("Header");
        expect(widgetArgs.help).toBe("Help");

        const label = wrapper.get("[data-qa='widget-label']");
        expect(label.attributes("data-skip-feedback")).toBe("true");
    });

    scopedIt("forwards slots to WidgetLabel", () => {
        const wrapper = mount(WidgetLabelContextByProps, {
            props: { fieldSetTabularInline: { formModel: {} }, fieldValuePath: "p" },
            attrs: { field: { name: "f" } },
            slots: {
                default: "<span data-qa='default-slot'>D</span>",
                extra: "<span data-qa='extra-slot'>E</span>",
            },
            global: { provide: { [FormContextSymbol]: { state: {} } } },
        });

        const label = wrapper.get("[data-qa='widget-label']");
        expect(label.find('[data-qa="default-slot"]').exists()).toBe(true);
        expect(label.find('[data-qa="extra-slot"]').exists()).toBe(true);
    });
});
