import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { SEARCH_PARAM } from "@vueda/utils/constants.js";
import { defineComponent, h, nextTick, reactive } from "vue";

// PrimeVue AutoComplete stub
const AutoCompleteStub = defineComponent({
    name: "AutoCompleteStub",
    props: ["modelValue", "optionLabel", "optionValue", "suggestions", "pt"],
    emits: ["update:model-value", "complete", "focus", "blur"],
    setup(props, { attrs }) {
        return () => h("div", { "data-qa": "auto-complete", ...attrs });
    },
});
vi.mock("primevue/autocomplete", () => ({ default: AutoCompleteStub }));

// WidgetLabel stub
const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    props: ["for"],
    setup(_, { slots }) {
        return () => h("label", { "data-qa": "widget-label" }, slots.default ? slots.default({ class: "" }) : null);
    },
});
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS: { for: {} },
    getWidgetSlotsComputed: () => [],
}));

// useWidget stub
const widgetState = reactive({
    widgetId: "wid",
    combinedName: "field",
    validationState: { invalid: false },
    disabled: false,
    required: true,
    combinedValue: null,
    focused: false,
});
const widgetContext = {
    state: widgetState,
    blur: vi.fn(),
    focus: vi.fn(),
};
const mockedUseWidget = vi.fn(() => widgetContext);
vi.mock("@vueda/use/useWidget.js", () => ({ WIDGET_PROPS: {}, WIDGET_EMITS: [], useWidget: mockedUseWidget }));

// other composable stubs
const mockedUseModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: mockedUseModelConfig }));

const mockedUseWidgetTheme = vi.fn(() => () => "theme");
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: mockedUseWidgetTheme }));

const mockedUseWarningClass = vi.fn(() => ({}));
vi.mock("@vueda/use/useWarningClass.js", () => ({
    PASSTHROUGH_OPTION_PROPS: {},
    useWarningClass: mockedUseWarningClass,
}));

let listProps;
let listInstance;
const mockedUseList = vi.fn((args) => {
    listProps = args.props;
    return listInstance;
});
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { ...actual, useList: mockedUseList };
});

const importComponent = () => import("@vueda/widgets/WidgetAutoComplete.vue");

let WidgetAutoComplete, modelConfig;

beforeEach(async () => {
    modelConfig = reactive({ loading: false, info: { pk: "uuid" } });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    WidgetAutoComplete = (await importComponent()).default;
    mockedUseWidget.mockClear();
    listProps = undefined;
    listInstance = { state: reactive({ objectsInOrder: [], loading: false }), clearList: vi.fn() };
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

scopedIt("uses model pk when optionValue is USE_PK", () => {
    const wrapper = mount(WidgetAutoComplete, { props: { app: "a", model: "b" } });
    const ac = wrapper.getComponent(AutoCompleteStub);
    expect(ac.props("optionValue")).toBe("uuid");
});

scopedIt("switches optionLabel based on focus state", async () => {
    const wrapper = mount(WidgetAutoComplete, {
        props: { app: "a", model: "b", displayLabel: "disp", optionLabel: "opt" },
    });
    const ac = wrapper.getComponent(AutoCompleteStub);
    expect(ac.props("optionLabel")).toBe("disp");
    widgetState.focused = true;
    await nextTick();
    expect(ac.props("optionLabel")).toBe("opt");
});

scopedIt("updates combinedValue when model value changes", async () => {
    const wrapper = mount(WidgetAutoComplete, { props: { app: "a", model: "b" } });
    const ac = wrapper.getComponent(AutoCompleteStub);
    ac.vm.$emit("update:model-value", { value: {}, uuid: 5 });
    await nextTick();
    expect(widgetState.combinedValue).toBe(5);
    ac.vm.$emit("update:model-value", 7);
    await nextTick();
    expect(widgetState.combinedValue).toBe(7);
});

scopedIt("updates search parameter after delay", async () => {
    vi.useFakeTimers();
    const wrapper = mount(WidgetAutoComplete, { props: { app: "a", model: "b" } });
    expect(listProps.params[SEARCH_PARAM]).toBeUndefined();
    const ac = wrapper.getComponent(AutoCompleteStub);
    ac.vm.$emit("complete", { query: "foo" });
    vi.advanceTimersByTime(250);
    await nextTick();
    expect(listProps.params[SEARCH_PARAM]).toBe("foo");
});
