import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";

// Stubs for child components used in template
const SimpleStub = (qa) =>
    defineComponent({
        name: `${qa}-stub`,
        setup(_, { slots }) {
            return () => h("div", { "data-qa": qa }, slots.default ? slots.default() : null);
        },
    });

vi.mock("@vueda/components/FieldRenderer.vue", () => ({ default: SimpleStub("field-renderer") }));
vi.mock("@vueda/components/FormChores.vue", () => ({ default: SimpleStub("form-chores") }));
vi.mock("@vueda/components/ObjectsGrid.vue", () => ({ default: SimpleStub("objects-grid") }));
vi.mock("@vueda/components/WidgetLabelContextByProps.vue", () => ({
    default: SimpleStub("widget-label-context-by-props"),
}));
vi.mock("@vueda/widgets/WidgetCheckbox.vue", () => ({ default: SimpleStub("widget-checkbox") }));
vi.mock("primevue/button", () => ({ default: SimpleStub("prime-button") }));
vi.mock("primevue/divider", () => ({ default: SimpleStub("prime-divider") }));

// Mock composable used by component
const useFieldSetTabularInline = vi.fn();
vi.mock("@vueda/use/useFieldSetTabularInline.js", () => ({
    FIELD_SET_TABULAR_INLINE_PROPS: {
        showCreateButton: { type: Boolean, default: true },
        fieldProps: { type: Object, default: undefined },
    },
    FIELD_SET_TABULAR_INLINE_EMITS: [],
    useFieldSetTabularInline,
}));

// Provide a global logger used in the component's watcher
const warnSpy = vi.fn();

vi.stubGlobal("logger", { warn: warnSpy });

const FieldSetTabularInline = await import("@vueda/fields/FieldSetTabularInline.vue").then((m) => m.default);

function mountWithContext(value, options = {}) {
    const { state: stateOverride, ...mountOptions } = options;
    const state = reactive({
        hidable: false,
        internalVisible: true,
        isTable: true,
        actions: [],
        fieldObjects: [],
        computedFieldObjects: [],
        computedFieldProps: {},
        showCreateButton: true,
        remainingSlotNames: [],
        selected: [],
        ...stateOverride,
    });
    const fieldSetContext = { state: reactive({ value, label: "Label", name: "items", formModelName: "fm" }) };
    useFieldSetTabularInline.mockReturnValue({
        state,
        fieldSetContext,
        formModel: { fieldProps: { fm: {} } },
        resolvedSlotNames: {
            title: { name: "title" },
            "toggle-button": { name: "toggle-button" },
            "create-button": { name: "create-button" },
            "create-button-inline": { name: "create-button-inline" },
            "destroy-button": { name: "destroy-button" },
            "destroy-checkbox": { name: "destroy-checkbox" },
            "item-action-button": { name: "item-action-button" },
        },
        theme: () => "",
        doCreate: vi.fn(),
        handleIsTableUpdate: vi.fn(),
        handleSelected: vi.fn(),
        refFn: vi.fn(),
        removeObject: vi.fn(),
        toggleVisibility: vi.fn(),
    });

    return mount(FieldSetTabularInline, { props: {}, ...mountOptions });
}

describe("lib/fields/FieldSetTabularInline.vue", () => {
    afterEach(() => {
        warnSpy.mockClear();
        vi.clearAllMocks();
    });

    scopedIt("warns when value is not an array", async () => {
        mountWithContext("notArray");
        await nextTick();
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringMatching(/Expected value to be an array of objects/),
            "notArray",
        );
    });

    scopedIt("warns when array contains non-object elements", async () => {
        const wrapper = mountWithContext([1, {}]);
        warnSpy.mockClear();
        // trigger watcher again by mutating value
        wrapper.vm.fieldSetTabularInline.fieldSetContext.state.value.push(2);
        await nextTick();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/Array contains non-object elements/), 1);
    });

    scopedIt("does not warn for valid array of objects", async () => {
        mountWithContext([{ id: 1 }]);
        await nextTick();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    scopedIt("does not warn when value is undefined", async () => {
        mountWithContext(undefined);
        await nextTick();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    scopedIt("does not warn when value is null", async () => {
        mountWithContext(null);
        await nextTick();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    scopedIt("emits toggleVisibility when slot content clicked", async () => {
        let slotClick;
        const wrapper = mountWithContext([], {
            state: { hidable: true },
            slots: {
                "toggle-button": (slotProps) => {
                    slotClick = slotProps.onClick;
                    return h("button", { "data-qa": "slot-toggle" }, "Toggle");
                },
            },
        });
        expect(typeof slotClick).toBe("function");
        slotClick();
        expect(wrapper.vm.fieldSetTabularInline.toggleVisibility).toHaveBeenCalled();
    });
});
