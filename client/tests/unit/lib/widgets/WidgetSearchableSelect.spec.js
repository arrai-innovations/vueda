import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive, ref } from "vue";

// Select stub exposing onContainerClick
const labelClickSpy = vi.fn();
const SelectStub = defineComponent({
    name: "SelectStub",
    props: [
        "modelValue",
        "options",
        "optionValue",
        "optionLabel",
        "optionGroupLabel",
        "optionGroupChildren",
        "virtualScrollerOptions",
        "pt",
        "ariaLabelledby",
        "disabled",
        "invalid",
        "ariaRequired",
        "emptyMessage",
    ],
    emits: ["update:modelValue", "before-show", "change", "hide", "blur", "focus"],
    setup(props, { expose, attrs, slots }) {
        const onContainerClick = labelClickSpy;
        expose({ onContainerClick, virtualScroller: {} });
        return () =>
            h(
                "div",
                { "data-qa": "prime-select", ...attrs },
                Object.entries(slots).map(([n, s]) => h("div", { "data-slot": n }, s ? s() : null)),
            );
    },
});
vi.mock("primevue/select", () => ({ default: SelectStub }));

// InputText stub
const InputTextStub = defineComponent({
    name: "InputTextStub",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    setup(props, { emit, attrs }) {
        return () => {
            const val =
                props.modelValue && typeof props.modelValue === "object" && "value" in props.modelValue
                    ? props.modelValue.value
                    : props.modelValue;
            return h("input", {
                "data-qa": "input-text",
                value: val,
                ...attrs,
                onInput: (e) => emit("update:modelValue", e.target.value),
            });
        };
    },
});
vi.mock("primevue/inputtext", () => ({ default: InputTextStub }));

// WidgetLabel stub emitting click
const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    emits: ["click"],
    props: ["id", "labelTag"],
    setup(_, { emit, slots }) {
        return () =>
            h(
                "label",
                { "data-qa": "widget-label", onClick: () => emit("click") },
                slots.default ? slots.default({ class: "label-class" }) : null,
            );
    },
});
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    __esModule: true,
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS: {},
    getWidgetSlotsComputed: () => () => [],
}));

// LinkModelView stub
const LinkModelViewStub = defineComponent({
    name: "LinkModelViewStub",
    props: ["app", "model", "pk", "view", "label"],
    setup(props) {
        return () =>
            h(
                "a",
                {
                    "data-qa": "link-model-view",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-pk": String(props.pk),
                    "data-view": props.view,
                    "data-label": props.label,
                },
                props.label,
            );
    },
});
vi.mock("@vueda/components/LinkModelView.vue", () => ({ default: LinkModelViewStub }));

const widgetState = reactive({
    widgetId: "wid",
    combinedValue: null,
    disabled: false,
    validationState: reactive({ invalid: false }),
    required: false,
});
const widgetContext = { state: widgetState, blur: vi.fn(), focus: vi.fn() };
const mockedUseWidget = vi.fn(() => widgetContext);
vi.mock("@vueda/use/useWidget.js", () => ({ WIDGET_EMITS: [], WIDGET_PROPS: {}, useWidget: mockedUseWidget }));

const themeFn = vi.fn((k) => `theme-${k}`);
const mockedUseWidgetTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: mockedUseWidgetTheme }));

const mockedUseWarningClass = vi.fn(() => "pt-class");
vi.mock("@vueda/use/useWarningClass.js", () => ({
    PASSTHROUGH_OPTION_PROPS: {},
    useWarningClass: mockedUseWarningClass,
}));

const searchableSelectInstance = {
    options: [{ id: 1, name: "one" }],
    optionValue: "id",
    optionLabel: "name",
    optionGroupLabel: "grp",
    optionGroupChildren: "items",
    virtualScrollerOptions: { foo: "bar" },
    onBeforeShow: vi.fn(),
    onChange: vi.fn(),
    onHide: vi.fn(),
    query: ref(""),
    emptyMessage: "none",
    selectedLabel: "selected",
    placeholder: "holder",
};
const mockedUseSearchableSelect = vi.fn(() => searchableSelectInstance);
vi.mock("@vueda/use/useSearchableSelect.js", () => ({
    SEARCHABLE_SELECT_PROPS: { app: {}, model: {}, readonly: Boolean },
    useSearchableSelect: mockedUseSearchableSelect,
}));

let WidgetSearchableSelect;

beforeEach(async () => {
    WidgetSearchableSelect = (await import("@vueda/widgets/WidgetSearchableSelect.vue")).default;
    mockedUseWidget.mockClear();
    mockedUseWidgetTheme.mockClear();
    mockedUseWarningClass.mockClear();
    mockedUseSearchableSelect.mockClear();
    widgetContext.blur.mockClear();
    widgetContext.focus.mockClear();
    themeFn.mockClear();
});

scopedIt("renders readonly link when readonly", () => {
    widgetState.combinedValue = 5;
    const wrapper = mount(WidgetSearchableSelect, { props: { app: "a", model: "m", readonly: true } });
    const link = wrapper.getComponent(LinkModelViewStub);
    expect(link.attributes("data-app")).toBe("a");
    expect(link.attributes("data-model")).toBe("m");
    expect(link.attributes("data-pk")).toBe("5");
    expect(link.attributes("data-label")).toBe("selected");
    expect(wrapper.findComponent(SelectStub).exists()).toBe(false);
});

scopedIt("passes props to select and handles events", async () => {
    const wrapper = mount(WidgetSearchableSelect, { props: { app: "a", model: "m" } });
    const select = wrapper.getComponent(SelectStub);
    expect(select.props("options")).toEqual(searchableSelectInstance.options);
    expect(select.props("optionValue")).toBe("id");
    expect(select.props("optionLabel")).toBe("name");
    expect(select.props("optionGroupLabel")).toBe("grp");
    expect(select.props("optionGroupChildren")).toBe("items");
    expect(select.props("virtualScrollerOptions")).toEqual({ foo: "bar" });
    expect(select.props("pt")).toBe("pt-class");
    expect(select.props("ariaLabelledby")).toBe("wid");
    expect(select.props("disabled")).toBe(false);
    expect(select.props("invalid")).toBe(false);
    expect(select.props("ariaRequired")).toBe(false);
    expect(select.props("emptyMessage")).toBe("none");

    select.vm.$emit("focus");
    select.vm.$emit("blur");
    await wrapper.vm.$nextTick();
    expect(widgetContext.focus).toHaveBeenCalled();
    expect(widgetContext.blur).toHaveBeenCalled();

    await wrapper.getComponent(WidgetLabelStub).trigger("click");
    expect(labelClickSpy).toHaveBeenCalled();
});

scopedIt("binds query to input field", async () => {
    const wrapper = mount(WidgetSearchableSelect, { props: { app: "a", model: "m" } });
    const input = wrapper.get("input[data-qa='input-text']");
    expect(input.element.value).toBe("");
    await input.setValue("abc");
    expect(searchableSelectInstance.query).toBe("abc");
});
