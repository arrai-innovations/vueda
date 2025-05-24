import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

const mockedUseFieldRenderer = vi.fn();
vi.mock("@vueda/use/useFieldRenderer.js", () => ({
    useFieldRenderer: mockedUseFieldRenderer,
}));

const themeFn = vi.fn((key) => `theme-${key}`);
const mockedUseTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    mergeTheme: (...args) => Object.assign({}, ...args),
}));

vi.mock("primevue/skeleton", () => ({
    default: defineComponent({
        name: "SkeletonStub",
        setup() {
            return () => h("div");
        },
    }),
}));

let FieldRenderer, vue, FieldStub, WidgetStub;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    FieldStub = vue.defineComponent({
        name: "FieldStub",
        props: ["class", "id"],
        setup(props, { slots }) {
            return () =>
                vue.h(
                    "div",
                    { "data-qa": "field-stub", class: props.class, id: props.id },
                    Object.keys(slots).map((n) => (slots[n] ? slots[n]() : null)),
                );
        },
    });
    WidgetStub = vue.defineComponent({
        name: "WidgetStub",
        props: ["hidden"],
        setup(props, { slots }) {
            return () =>
                vue.h(
                    "span",
                    { "data-qa": "widget-stub", "data-hidden": String(props.hidden) },
                    Object.keys(slots).map((n) => (slots[n] ? slots[n]() : null)),
                );
        },
    });
    mockedUseFieldRenderer.mockReturnValue({
        fieldComponent: vue.computed(() => FieldStub),
        widgetComponent: vue.computed(() => WidgetStub),
        fieldSlotName: vue.computed(() => "field(foo)"),
        widgetSlotName: vue.computed(() => "widget(foo)"),
        fieldProps: vue.computed(() => ({ id: "fid", class: "fld-class" })),
        widgetProps: vue.computed(() => ({ hidden: false })),
        fieldDetail: vue.computed(() => ({ label: "Foo" })),
        slotsForPassing: vue.computed(() => []),
        fieldValuePath: vue.computed(() => "foo"),
        fieldDefaultSlotName: vue.computed(() => "field(foo)default"),
        widgetDefaultSlotName: vue.computed(() => "widget(foo)default"),
        remainingSlots: vue.computed(() => ["extra"]),
        stop: () => {},
    });
    FieldRenderer = (await import("@vueda/components/FieldRenderer.vue")).default;
    themeFn.mockClear();
    mockedUseTheme.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

const baseFormModel = {
    theme: {},
    fieldComponents: {},
    widgetComponents: {},
    fieldDetails: {},
    fieldProps: {},
    widgetProps: {},
};

scopedIt("renders field and widget components with slots", () => {
    const wrapper = mount(FieldRenderer, {
        props: { formModelName: "foo", formModel: baseFormModel },
        attrs: { class: "outer" },
        slots: {
            extra: "<span data-qa='extra-slot'>X</span>",
        },
    });

    expect(mockedUseFieldRenderer).toHaveBeenCalled();
    expect(mockedUseTheme).toHaveBeenCalledWith("FormModel", expect.any(Object), expect.any(Object));

    const field = wrapper.get("[data-qa='field-stub']");
    expect(field.classes()).toContain("theme-field");
    expect(field.classes()).toContain("fld-class");
    expect(field.classes()).toContain("outer");

    const inner = wrapper.get("[data-qa='field-renderer-field-inner']");
    expect(inner.classes()).toContain("theme-fieldInner");

    const widget = wrapper.get("[data-qa='widget-stub']");
    expect(widget.attributes("data-hidden")).toBe("false");

    const anchor = wrapper.get("a");
    expect(anchor.attributes("name")).toBe("foo");

    expect(wrapper.findAll("[data-qa='extra-slot']").length).toBe(2);
});
