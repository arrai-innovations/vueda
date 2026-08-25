import { makeUseThemeMock } from "@tests/unit/themeStub.js";
import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

// This spec mounts FieldSetTabularInline against the real ObjectsGrid,
// ObjectsGridTableHeader, and ObjectsGridCardCell so the forwarded
// `header(fieldName)` slots are exercised in both layouts.

const mockedUseTheme = makeUseThemeMock();
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

// ObjectsGrid picks its layout from the breakpoint; drive it from the spec.
const isTableByBreakpoint = { value: true };
vi.mock("@vueuse/core", async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useBreakpoints: () => ({ greaterOrEqual: () => isTableByBreakpoint }),
    };
});

const SimpleStub = (qa) =>
    defineComponent({
        name: `${qa}-stub`,
        setup(_, { slots }) {
            return () => h("div", { "data-qa": qa }, slots.default ? slots.default() : null);
        },
    });

vi.mock("@vueda/form/form-model/FieldRenderer.vue", () => ({ default: SimpleStub("field-renderer") }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: SimpleStub("control-button") }));
vi.mock("@vueda/widgets/WidgetCheckbox.vue", () => ({ default: SimpleStub("widget-checkbox") }));
vi.mock("@vueda/shell/field/FieldDescription.vue", () => ({ default: SimpleStub("field-description") }));
vi.mock("@vueda/shell/field/FieldMessage.vue", () => ({ default: SimpleStub("field-message") }));

const useFieldSetTabularInline = vi.fn();
vi.mock("@vueda/use/useFieldSetTabularInline.js", () => ({
    FIELD_SET_TABULAR_INLINE_PROPS: {
        showCreateButton: { type: Boolean, default: true },
        fieldProps: { type: Object, default: undefined },
    },
    FIELD_SET_TABULAR_INLINE_EMITS: [],
    useFieldSetTabularInline,
}));

vi.mock("@vueda/use/useDevLogger.js", () => ({
    useDevLogger: () => ({
        warn: vi.fn(),
        log: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    }),
}));

const FieldSetTabularInline = await import("@vueda/form/field-set/FieldSetTabularInline.vue").then((m) => m.default);

const fieldObjects = [
    { name: "quantity", label: "Quantity" },
    { name: "note", label: "Note" },
];

function mountInline({ isTable = true, actions = [], slots = {} } = {}) {
    isTableByBreakpoint.value = isTable;
    const state = reactive({
        hidable: false,
        internalVisible: true,
        isTable,
        actions,
        fieldObjects,
        computedFieldObjects: actions.length ? [{ name: "item-action-bar" }, ...fieldObjects] : [...fieldObjects],
        computedFieldProps: {},
        showCreateButton: false,
        remainingSlotNames: [],
        selected: [],
    });
    const fieldSetContext = {
        state: reactive({
            value: [{ id: 7, quantity: 3, note: "first note" }],
            label: "Items",
            name: "items",
            formModelName: "fm",
            help: "",
            errors: {},
            messages: {},
        }),
    };
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
            "field-set-level-chores": { name: "field-set-level-chores", exists: false },
            "empty-state": { name: "empty-state" },
        },
        theme: () => "",
        doCreate: vi.fn(),
        handleIsTableUpdate: vi.fn(),
        handleSelected: vi.fn(),
        refFn: vi.fn(),
        removeObject: vi.fn(),
        toggleVisibility: vi.fn(),
    });

    return mount(FieldSetTabularInline, { props: {}, slots });
}

describe("lib/form/field-set/FieldSetTabularInline.vue", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe("Default field header labels", () => {
        scopedIt("renders each field label in the table header", () => {
            const wrapper = mountInline({ isTable: true });
            expect(wrapper.get('[data-header="quantity"]').text()).toBe("Quantity");
            expect(wrapper.get('[data-header="note"]').text()).toBe("Note");
        });

        scopedIt("renders each field label in the card header", () => {
            const wrapper = mountInline({ isTable: false });
            expect(wrapper.get('[data-card-header="quantity"]').text()).toBe("Quantity");
            expect(wrapper.get('[data-card-header="note"]').text()).toBe("Note");
        });

        scopedIt("leaves the item action column unlabeled", () => {
            const wrapper = mountInline({
                isTable: true,
                actions: [{ fieldName: "destroy", label: "Delete", value: true }],
            });
            expect(wrapper.get('[data-header="item-action-bar"]').text()).toBe("");
        });
    });

    describe("Consumer header overrides", () => {
        scopedIt("replaces the default label for the overridden field only", () => {
            const wrapper = mountInline({
                isTable: true,
                slots: {
                    "header(quantity)": () => h("span", { "data-qa": "custom-header" }, "Qty"),
                },
            });
            const overridden = wrapper.get('[data-header="quantity"]');
            expect(overridden.find('[data-qa="custom-header"]').exists()).toBe(true);
            expect(overridden.text()).toBe("Qty");
            expect(wrapper.get('[data-header="note"]').text()).toBe("Note");
        });

        scopedIt("replaces the default label in the card header too", () => {
            const wrapper = mountInline({
                isTable: false,
                slots: {
                    "header(quantity)": () => h("span", { "data-qa": "custom-header" }, "Qty"),
                },
            });
            expect(wrapper.find('[data-card-header="quantity"]').exists()).toBe(false);
            expect(wrapper.get('[data-qa="custom-header"]').text()).toBe("Qty");
            expect(wrapper.get('[data-card-header="note"]').text()).toBe("Note");
        });
    });
});
