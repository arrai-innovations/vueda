import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive, ref } from "vue";

const makeStub = (qa) =>
    defineComponent({
        name: `${qa}-stub`,
        props: ["modelValue", "options", "loading", "onFocus", "ariaRequired"],
        emits: ["update:model-value"],
        setup(props, { emit }) {
            return () =>
                h("div", {
                    "data-qa": qa,
                    onFocus: props.onFocus,
                    onClick: () => emit("update:model-value", "new"),
                });
        },
    });

const SelectStub = makeStub("select-stub");
const MultiSelectStub = makeStub("multiselect-stub");
const RadioStub = makeStub("radio-stub");

vi.mock("@vueda/widgets/WidgetSelect.vue", () => ({ default: SelectStub }));
vi.mock("@vueda/widgets/WidgetMultiSelect.vue", () => ({ default: MultiSelectStub }));
vi.mock("@vueda/widgets/WidgetRadio.vue", () => ({ default: RadioStub }));

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

let WidgetModel;

beforeEach(async () => {
    WidgetModel = (await import("@vueda/widgets/WidgetModel.vue")).default;
    mockedUseWidget.mockClear();
    mockedUseModelChoices.mockClear();
});

scopedIt.each([
    ["select", "select-stub"],
    ["multiSelect", "multiselect-stub"],
    ["radio", "radio-stub"],
])("renders widget component for type %s", (type, qa) => {
    const wrapper = mount(WidgetModel, {
        props: {
            fieldApp: "a",
            fieldModel: "b",
            app: "c",
            model: "d",
            fieldName: "status",
            type,
        },
    });
    expect(wrapper.find(`[data-qa='${qa}']`).exists()).toBe(true);
});

scopedIt("passes choices and emits updates", async () => {
    const wrapper = mount(WidgetModel, {
        props: {
            fieldApp: "a",
            fieldModel: "b",
            app: "c",
            model: "d",
            fieldName: "status",
            type: "select",
            modelValue: 1,
        },
    });
    const cmp = wrapper.getComponent(SelectStub);
    expect(cmp.props("options")).toEqual(modelChoices.choices.status.results);
    expect(cmp.props("loading")).toBe(false);
    cmp.vm.$emit("update:model-value", 2);
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("update:modelValue")[0]).toEqual([2]);
});

scopedIt("tracks focus to compute intendToFetch", async () => {
    const wrapper = mount(WidgetModel, {
        props: {
            fieldApp: "a",
            fieldModel: "b",
            app: "c",
            model: "d",
            fieldName: "status",
            type: "select",
        },
    });
    const callArgs = mockedUseModelChoices.mock.calls[0][0].status;
    expect(callArgs.intendToFetch.value).toBe(false);
    wrapper.getComponent(SelectStub).props("onFocus")();
    await wrapper.vm.$nextTick();
    expect(callArgs.intendToFetch.value).toBe(true);
});
