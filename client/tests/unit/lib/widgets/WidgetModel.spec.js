import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive, ref } from "vue";

const ComboboxStub = defineComponent({
    name: "combobox-stub",
    props: ["modelValue", "options", "multiple", "optionLabel", "optionValue"],
    emits: ["update:model-value"],
    setup(props, { emit }) {
        return () =>
            h("div", {
                "data-qa": "combobox-stub",
                onClick: () => emit("update:model-value", "new"),
            });
    },
});

const RadioGroupStub = defineComponent({
    name: "radio-group-stub",
    props: ["modelValue", "options", "optionLabel", "optionValue"],
    setup() {
        return () => h("div", { "data-qa": "radio-group-stub" });
    },
});

vi.mock("@vueda/widgets/WidgetCombobox.vue", () => ({ default: ComboboxStub }));
vi.mock("@vueda/widgets/WidgetRadioGroup.vue", () => ({ default: RadioGroupStub }));

const widgetState = reactive({ required: false, combinedValue: null });
const widgetContext = { state: widgetState };
const mockedUseWidget = vi.fn(() => widgetContext);
vi.mock("@vueda/use/useWidget.js", () => ({ WIDGET_EMITS: ["update:modelValue"], useWidget: mockedUseWidget }));

const mockedIsActive = ref(true);
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: vi.fn(() => mockedIsActive) }));

const modelChoices = reactive({
    loading: false,
    choices: { status: { results: [{ label: "A", value: 1 }] } },
});
const mockedUseModelChoices = vi.fn(() => modelChoices);
vi.mock("@vueda/use/useModelChoices.js", () => ({ useModelChoices: mockedUseModelChoices }));

const BASE_PROPS = { fieldApp: "a", fieldModel: "b", fieldName: "status" };

let WidgetModel;

beforeEach(async () => {
    WidgetModel = (await import("@vueda/widgets/WidgetModel.vue")).default;
    mockedUseWidget.mockClear();
    mockedUseModelChoices.mockClear();
});

describe("lib/widgets/WidgetModel.vue", () => {
    scopedIt.each([
        ["select", "combobox-stub"],
        ["multiSelect", "combobox-stub"],
        ["radio", "radio-group-stub"],
    ])("renders the correct widget for type %s", (type, qa) => {
        const wrapper = mount(WidgetModel, { props: { ...BASE_PROPS, type } });
        expect(wrapper.find(`[data-qa='${qa}']`).exists()).toBe(true);
    });

    scopedIt("passes choices as options to the child widget", async () => {
        const wrapper = mount(WidgetModel, {
            props: { ...BASE_PROPS, type: "select", modelValue: 1 },
        });
        const cmp = wrapper.getComponent(ComboboxStub);
        expect(cmp.props("options")).toEqual(modelChoices.choices.status.results);
    });

    scopedIt("emits update:modelValue when child emits update:model-value", async () => {
        const wrapper = mount(WidgetModel, {
            props: { ...BASE_PROPS, type: "select", modelValue: 1 },
        });
        wrapper.getComponent(ComboboxStub).vm.$emit("update:model-value", 2);
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted("update:modelValue")[0]).toEqual([2]);
    });

    scopedIt("passes multiple=true for type multiSelect", () => {
        const wrapper = mount(WidgetModel, { props: { ...BASE_PROPS, type: "multiSelect" } });
        expect(wrapper.getComponent(ComboboxStub).props("multiple")).toBe(true);
    });

    scopedIt("does not pass multiple for type select", () => {
        const wrapper = mount(WidgetModel, { props: { ...BASE_PROPS, type: "select" } });
        expect(wrapper.getComponent(ComboboxStub).props("multiple")).toBeFalsy();
    });

    scopedIt("sets intendToFetch when the wrapper receives focusin", async () => {
        const wrapper = mount(WidgetModel, { props: { ...BASE_PROPS, type: "select" } });
        const callArgs = mockedUseModelChoices.mock.calls[0][0].status;
        expect(callArgs.intendToFetch.value).toBe(false);
        await wrapper.find("div").trigger("focusin");
        expect(callArgs.intendToFetch.value).toBe(true);
    });

    scopedIt("intendToFetch is true when combinedValue is set before focus", () => {
        widgetState.combinedValue = 1;
        mount(WidgetModel, { props: { ...BASE_PROPS, type: "select" } });
        const callArgs = mockedUseModelChoices.mock.calls[0][0].status;
        expect(callArgs.intendToFetch.value).toBeTruthy();
    });
});
