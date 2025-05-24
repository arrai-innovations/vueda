import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { SEARCH_PARAM } from "@vueda/utils/constants.js";
import { defineComponent, h, nextTick, reactive } from "vue";

// Stubs
const AutoCompleteStub = defineComponent({
    name: "AutoCompleteStub",
    props: ["modelValue", "disabled", "suggestions"],
    emits: ["update:model-value", "complete", "focus", "blur"],
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "auto-complete", ...attrs });
    },
});

let selectOnContainerClick;
const SelectStub = defineComponent({
    name: "SelectStub",
    props: ["modelValue", "options"],
    emits: ["update:model-value"],
    setup(_, { attrs, expose }) {
        selectOnContainerClick = vi.fn();
        expose({ onContainerClick: selectOnContainerClick });
        return () => h("div", { "data-qa": "select", ...attrs });
    },
});

const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    emits: ["click"],
    setup(_, { emit, slots }) {
        return () =>
            h(
                "label",
                { "data-qa": "widget-label", onClick: () => emit("click") },
                slots.default ? slots.default({ class: "" }) : null,
            );
    },
});

vi.mock("primevue/autocomplete", () => ({ default: AutoCompleteStub }));
vi.mock("primevue/select", () => ({ default: SelectStub }));
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    __esModule: true,
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS: {},
    getWidgetSlotsComputed: () => () => [],
}));

const themeFn = vi.fn(() => "t");
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: vi.fn(() => themeFn) }));
vi.mock("@vueda/use/useTheme.js", () => ({ THEME_OVERRIDE_PROPS: {} }));
vi.mock("@vueda/use/useWarningClass.js", () => ({
    PASSTHROUGH_OPTION_PROPS: {},
    useWarningClass: vi.fn(() => ({})),
}));

let widgetState;
const mockedUseWidget = vi.fn();
vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_EMITS: [],
    WIDGET_PROPS: {},
    useWidget: mockedUseWidget,
}));

const modelConfig = reactive({ loading: false, info: { pk: "id" } });
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: vi.fn(() => modelConfig) }));

let listProps;
const listInstance = { state: reactive({ objects: {}, loading: false }) };
const mockedUseList = vi.fn((args) => {
    listProps = args.props;
    return listInstance;
});
vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return { ...actual, useList: mockedUseList };
});

const importComponent = () => import("@vueda/widgets/WidgetGenericAutoComplete.vue");

let WidgetGenericAutoComplete;

beforeEach(async () => {
    widgetState = reactive({
        widgetId: "wid",
        combinedName: "name",
        validationState: { invalid: false },
        disabled: false,
        required: false,
        combinedValue: null,
        focused: false,
    });
    mockedUseWidget.mockReturnValue({ state: widgetState, blur: vi.fn(), focus: vi.fn() });
    WidgetGenericAutoComplete = (await importComponent()).default;
    selectOnContainerClick = undefined;
    listProps = undefined;
});

afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
});

scopedIt("disables autocomplete until type selected", async () => {
    const wrapper = mount(WidgetGenericAutoComplete, {
        props: { app: "a", model: "b", modelFields: [] },
    });
    const ac = wrapper.getComponent(AutoCompleteStub);
    expect(ac.props("disabled")).toBe(true);
    const sel = wrapper.getComponent(SelectStub);
    sel.vm.$emit("update:model-value", "contentTypeID1");
    await nextTick();
    expect(ac.props("disabled")).toBe(false);
});

scopedIt("updates combinedValue when object selected", async () => {
    const wrapper = mount(WidgetGenericAutoComplete, {
        props: { app: "a", model: "b", modelFields: [] },
    });
    const ac = wrapper.getComponent(AutoCompleteStub);
    ac.vm.$emit("update:model-value", { value: "obj1" });
    await nextTick();
    expect(widgetState.combinedValue).toEqual({ content_type: null, object_id: "obj1" });
});

scopedIt("updates search parameter after delay", async () => {
    vi.useFakeTimers();
    const wrapper = mount(WidgetGenericAutoComplete, {
        props: { app: "a", model: "b", modelFields: [] },
    });
    expect(listProps.params[SEARCH_PARAM]).toBe("");
    const ac = wrapper.getComponent(AutoCompleteStub);
    ac.vm.$emit("complete", { query: "foo" });
    vi.advanceTimersByTime(250);
    await nextTick();
    expect(listProps.params[SEARCH_PARAM]).toBe("foo");
});

scopedIt("clicking label forwards to select", async () => {
    const wrapper = mount(WidgetGenericAutoComplete, {
        props: { app: "a", model: "b", modelFields: [] },
    });
    await wrapper.get("[data-qa='widget-label']").trigger("click");
    expect(selectOnContainerClick).toHaveBeenCalled();
});
