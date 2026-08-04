import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";

const ComboboxStub = defineComponent({
    name: "combobox-stub",
    props: [
        "modelValue",
        "options",
        "optionLabel",
        "optionValue",
        "app",
        "model",
        "modelFields",
        "disabled",
        "contextless",
        "placeholder",
    ],
    emits: ["update:model-value"],
    setup(props, { emit }) {
        return () =>
            h("div", {
                "data-qa": props.options ? "type-combobox" : "object-combobox",
                onClick: () => emit("update:model-value", props.options ? "contentTypeID1" : "obj1"),
            });
    },
});

vi.mock("@vueda/widgets/WidgetCombobox.vue", () => ({ default: ComboboxStub }));

let widgetState;
const mockedUseWidget = vi.fn();
vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_EMITS: ["update:modelValue"],
    WIDGET_PROPS: {},
    useWidget: mockedUseWidget,
}));

const BASE_PROPS = { app: "myapp", model: "mymodel", modelFields: ["id", "name"] };

let WidgetGenericAutoComplete;

beforeEach(async () => {
    widgetState = reactive({
        combinedName: "name",
        validationState: { invalid: false },
        disabled: false,
        required: false,
        combinedValue: null,
    });
    mockedUseWidget.mockReturnValue({ state: widgetState, blur: vi.fn(), focus: vi.fn() });
    WidgetGenericAutoComplete = (await import("@vueda/widgets/WidgetGenericAutoComplete.vue")).default;
});

describe("lib/widgets/WidgetGenericAutoComplete.vue", () => {
    scopedIt("renders two combobox instances", () => {
        const wrapper = mount(WidgetGenericAutoComplete, { props: BASE_PROPS });
        const comboboxes = wrapper.findAllComponents(ComboboxStub);
        expect(comboboxes).toHaveLength(2);
    });

    scopedIt("type combobox receives static dropdown options", () => {
        const wrapper = mount(WidgetGenericAutoComplete, { props: BASE_PROPS });
        const typeCombobox = wrapper.findAllComponents(ComboboxStub)[0];
        expect(typeCombobox.props("options")).toHaveLength(6);
        expect(typeCombobox.props("optionLabel")).toBe("label");
        expect(typeCombobox.props("optionValue")).toBe("value");
    });

    scopedIt("object combobox receives app, model, and modelFields", () => {
        const wrapper = mount(WidgetGenericAutoComplete, { props: BASE_PROPS });
        const objectCombobox = wrapper.findAllComponents(ComboboxStub)[1];
        expect(objectCombobox.props("app")).toBe("myapp");
        expect(objectCombobox.props("model")).toBe("mymodel");
        expect(objectCombobox.props("modelFields")).toEqual(["id", "name"]);
    });

    scopedIt("object combobox is disabled when no type is selected", () => {
        const wrapper = mount(WidgetGenericAutoComplete, { props: BASE_PROPS });
        const objectCombobox = wrapper.findAllComponents(ComboboxStub)[1];
        expect(objectCombobox.props("disabled")).toBe(true);
    });

    scopedIt("object combobox is enabled after a type is selected", async () => {
        const wrapper = mount(WidgetGenericAutoComplete, { props: BASE_PROPS });
        const typeCombobox = wrapper.findAllComponents(ComboboxStub)[0];
        typeCombobox.vm.$emit("update:model-value", "contentTypeID1");
        await nextTick();
        const objectCombobox = wrapper.findAllComponents(ComboboxStub)[1];
        expect(objectCombobox.props("disabled")).toBe(false);
    });

    scopedIt("selecting a type updates combinedValue.content_type", async () => {
        const wrapper = mount(WidgetGenericAutoComplete, { props: BASE_PROPS });
        wrapper.findAllComponents(ComboboxStub)[0].vm.$emit("update:model-value", "contentTypeID1");
        await nextTick();
        expect(widgetState.combinedValue).toEqual({ content_type: "contentTypeID1" });
    });

    scopedIt("selecting an object updates combinedValue.object_id", async () => {
        widgetState.combinedValue = { content_type: "contentTypeID1" };
        const wrapper = mount(WidgetGenericAutoComplete, { props: BASE_PROPS });
        wrapper.findAllComponents(ComboboxStub)[1].vm.$emit("update:model-value", "obj1");
        await nextTick();
        expect(widgetState.combinedValue).toEqual({ content_type: "contentTypeID1", object_id: "obj1" });
    });

    scopedIt("object placeholder reflects selected type label", async () => {
        const wrapper = mount(WidgetGenericAutoComplete, { props: BASE_PROPS });
        wrapper.findAllComponents(ComboboxStub)[0].vm.$emit("update:model-value", "contentTypeID1");
        await nextTick();
        const objectCombobox = wrapper.findAllComponents(ComboboxStub)[1];
        expect(objectCombobox.props("placeholder")).toBe("Search for a Task...");
    });

    scopedIt("displays existing combinedValue on load", () => {
        widgetState.combinedValue = { content_type: "contentTypeID2", object_id: "obj5" };
        const wrapper = mount(WidgetGenericAutoComplete, { props: BASE_PROPS });
        const comboboxes = wrapper.findAllComponents(ComboboxStub);
        expect(comboboxes[0].props("modelValue")).toBe("contentTypeID2");
        expect(comboboxes[1].props("modelValue")).toBe("obj5");
    });
});
