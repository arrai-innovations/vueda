import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

// PrimeVue Select stub
const SelectStub = defineComponent({
    name: "SelectStub",
    props: [
        "modelValue",
        "optionLabel",
        "optionValue",
        "options",
        "pt",
        "ariaLabelledby",
        "disabled",
        "invalid",
        "ariaRequired",
    ],
    emits: ["update:model-value", "focus", "blur"],
    setup(props, { attrs, expose }) {
        const onContainerClick = vi.fn();
        expose({ onContainerClick });
        return () => h("div", { "data-qa": "prime-select", ...attrs });
    },
});
vi.mock("primevue/select", () => ({ default: SelectStub }));

// WidgetLabel stub
const WidgetLabelStub = defineComponent({
    name: "WidgetLabelStub",
    emits: ["click"],
    setup(_, { slots, emit }) {
        return () =>
            h(
                "label",
                { "data-qa": "widget-label", onClick: (e) => emit("click", e) },
                slots.default ? slots.default({ class: "lbl" }) : null,
            );
    },
});
vi.mock("@vueda/widgets/WidgetLabel.vue", () => ({
    default: WidgetLabelStub,
    WIDGET_LABEL_PROPS: {},
    getWidgetSlotsComputed: () => () => [],
}));

// useWidget and related composables
let state;
const focus = vi.fn();
const blur = vi.fn();
const mockedUseWidget = vi.fn(() => {
    state = reactive({
        widgetId: "wid",
        combinedValue: 1,
        disabled: false,
        validationState: { invalid: false },
        combinedName: "name",
        required: false,
    });
    return { state, focus, blur };
});
vi.mock("@vueda/use/useWidget.js", () => ({
    WIDGET_PROPS: {},
    WIDGET_EMITS: [],
    useWidget: mockedUseWidget,
}));

const themeFn = vi.fn((k) => `t-${k}`);
vi.mock("@vueda/use/useWidgetTheme.js", () => ({ useWidgetTheme: () => themeFn }));
vi.mock("@vueda/use/useWarningClass.js", () => ({
    PASSTHROUGH_OPTION_PROPS: {},
    useWarningClass: () => "pt",
}));

let WidgetSelect;

beforeEach(async () => {
    WidgetSelect = (await import("@vueda/widgets/WidgetSelect.vue")).default;
    mockedUseWidget.mockClear();
    themeFn.mockClear();
    focus.mockClear();
    blur.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/widgets/WidgetSelect.vue", () => {
    scopedIt("applies theme classes and forwards attrs", () => {
        const wrapper = mount(WidgetSelect, {
            props: { options: [{ label: "One", value: 1 }] },
            attrs: { placeholder: "here", value: "omit" },
        });
        expect(wrapper.classes()).toContain("t-root");
        const inner = wrapper.get('[data-qa="widget-select-inner"]');
        expect(inner.classes()).toContain("t-inner");
        expect(inner.classes()).toContain("lbl");
        const select = wrapper.getComponent(SelectStub);
        expect(select.props("modelValue")).toBe(1);
        expect(select.props("options")).toHaveLength(1);
        expect(select.props("optionLabel")).toBe("label");
        expect(select.props("optionValue")).toBe("value");
        expect(select.props("pt")).toBe("pt");
        expect(select.attributes("placeholder")).toBe("here");
        expect(select.attributes("value")).toBeUndefined();
    });

    scopedIt("updates model and handles focus/blur", async () => {
        const onFocus = vi.fn();
        const onBlur = vi.fn();
        const wrapper = mount(WidgetSelect, {
            props: { options: [{ label: "A", value: "a" }] },
            attrs: { "on-focus": onFocus, "on-blur": onBlur },
        });
        const select = wrapper.getComponent(SelectStub);
        select.vm.$emit("focus", 1);
        await wrapper.vm.$nextTick();
        expect(focus).toHaveBeenCalled();
        expect(onFocus).toHaveBeenCalledWith(1);
        select.vm.$emit("blur", 2);
        await wrapper.vm.$nextTick();
        expect(blur).toHaveBeenCalled();
        expect(onBlur).toHaveBeenCalledWith(2);
        select.vm.$emit("update:model-value", "b");
        await wrapper.vm.$nextTick();
        expect(state.combinedValue).toBe("b");
    });

    scopedIt("calls select onContainerClick when label clicked", async () => {
        const wrapper = mount(WidgetSelect, { props: { options: [] } });
        const select = wrapper.getComponent(SelectStub);
        await wrapper.vm.$nextTick();
        await wrapper.get('[data-qa="widget-label"]').trigger("click");
        expect(select.vm.$.exposed.onContainerClick).toHaveBeenCalled();
    });
});
