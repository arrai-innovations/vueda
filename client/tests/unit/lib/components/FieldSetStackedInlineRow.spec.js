import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive } from "vue";

const FieldRendererStub = defineComponent({
    name: "FieldRendererStub",
    props: ["formModelName", "fieldsetStackedInlineProps"],
    setup(props) {
        return () =>
            h("div", {
                "data-qa": "field-renderer",
                "data-name": props.formModelName,
                "data-index": props.fieldsetStackedInlineProps.index,
            });
    },
});
vi.mock("@vueda/components/FieldRenderer.vue", () => ({ default: FieldRendererStub }));

const WidgetCheckboxStub = defineComponent({
    name: "WidgetCheckboxStub",
    emits: ["update:model-value"],
    setup(_, { emit }) {
        return () =>
            h("input", {
                "data-qa": "widget-checkbox-stub",
                type: "checkbox",
                onChange: (e) => emit("update:model-value", e.target.checked),
            });
    },
});
vi.mock("@vueda/widgets/WidgetCheckbox.vue", () => ({ default: WidgetCheckboxStub }));

const ButtonStub = defineComponent({
    name: "ButtonStub",
    emits: ["click", "update:model-value"],
    setup(_, { emit, slots }) {
        return () => {
            const children = slots.default?.();
            const label = children?.[0]?.children;
            return h("button", {
                "data-qa": "button-stub",
                "data-label": typeof label === "string" ? label.trim() : undefined,
                onClick: () => emit("click"),
                onUpdateModelValue: (v) => emit("update:model-value", v),
            });
        };
    },
});
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));

const themeFn = vi.fn((k) => k);
const mockedUseTheme = vi.fn(() => themeFn);
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

const useSlotNameResolver = vi.fn(() => ({ name: "slot" }));
vi.mock("@vueda/use/useSlotNameResolver.js", () => ({ useSlotNameResolver }));

let FieldSetStackedInlineRow;

beforeEach(async () => {
    FieldSetStackedInlineRow = (await import("@vueda/components/FieldSetStackedInlineRow.vue")).default;
    mockedUseTheme.mockClear();
    themeFn.mockClear();
    useSlotNameResolver.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/components/FieldSetStackedInlineRow.vue", () => {
    const mountWithContext = (options = {}) => {
        const formModel = {
            expand: options.expand ?? ["a"],
            fieldProps: {},
            fieldComponents: {},
            fieldDetails: {},
            widgetComponents: {},
            widgetProps: {},
        };
        const fieldSetContextState = reactive({
            fieldObjects: options.fieldObjects ?? [],
            actions: options.actions ?? [],
            selected: options.selected ?? [],
        });
        return mount(FieldSetStackedInlineRow, {
            props: {
                index: 0,
                fieldName: "fs",
                fieldSetContextState,
                pk: options.pk,
            },
            global: {
                provide: { [FormModelSymbol]: formModel },
            },
        });
    };

    scopedIt("does not render when formModel has no expand", () => {
        const wrapper = mountWithContext({ expand: [] });
        expect(wrapper.html()).toBe("<!--v-if-->");
    });

    scopedIt("renders field renderers for non-action fields", () => {
        const wrapper = mountWithContext({
            fieldObjects: [{ name: "a" }, { name: "b" }, { name: "c", action: true }],
        });
        const frs = wrapper.findAll('[data-qa="field-renderer"]');
        expect(frs).toHaveLength(2);
        expect(frs[0].attributes("data-name")).toBe("a");
        expect(frs[1].attributes("data-name")).toBe("b");
    });

    scopedIt("emits destroy-row when delete button clicked without pk", async () => {
        const wrapper = mountWithContext({
            actions: [{ fieldName: "destroy", label: "Delete", value: 1 }],
        });
        const btn = wrapper.get('[data-qa="button-stub"]');
        expect(btn.attributes("data-label")).toBe("Delete");
        await btn.trigger("click");
        expect(wrapper.emitted("destroy-row")[0]).toEqual([0]);
    });

    scopedIt("emits update:selected from checkbox when pk present", async () => {
        const wrapper = mountWithContext({
            pk: 1,
            actions: [{ fieldName: "destroy", label: "Delete", value: 1 }],
        });
        const cb = wrapper.getComponent(WidgetCheckboxStub);
        cb.vm.$emit("update:model-value", true);
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted("update:selected")[0]).toEqual([true]);
    });

    scopedIt("forwards update:model-value from action button", async () => {
        const wrapper = mountWithContext({
            actions: [{ fieldName: "save", label: "Save", value: 2 }],
        });
        const btn = wrapper.getComponent(ButtonStub);
        expect(btn.attributes("data-label")).toBe("Save");
        btn.vm.$emit("update:model-value", "v");
        await wrapper.vm.$nextTick();
        expect(wrapper.emitted("update:model-value")[0]).toEqual(["v"]);
    });
});
