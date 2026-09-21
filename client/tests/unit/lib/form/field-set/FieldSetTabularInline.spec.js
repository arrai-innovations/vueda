import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";

const warnSpy = vi.fn();

// Stubs for child components used in template
const SimpleStub = (qa) =>
    defineComponent({
        name: `${qa}-stub`,
        setup(_, { slots }) {
            return () => h("div", { "data-qa": qa }, slots.default ? slots.default() : null);
        },
    });

vi.mock("@vueda/form/form-model/FieldRenderer.vue", () => ({ default: SimpleStub("field-renderer") }));
vi.mock("@vueda/objects-grid/ObjectsGrid.vue", () => ({
    default: defineComponent({
        props: ["objectsInOrder"],
        setup:
            (props, { slots }) =>
            () =>
                h(
                    "div",
                    { "data-qa": "objects-grid" },
                    Array.isArray(props.objectsInOrder)
                        ? props.objectsInOrder.map((obj, rowIndex) =>
                              h(
                                  "div",
                                  { "data-row": rowIndex },
                                  slots["field(item-action-bar)"]?.({ pk: obj?.id, rowIndex }),
                              ),
                          )
                        : [],
                ),
    }),
}));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: SimpleStub("control-button") }));
vi.mock("@vueda/shell/field/FieldDescription.vue", () => ({
    default: defineComponent({
        name: "FieldDescription",
        setup:
            (_, { slots }) =>
            () =>
                h("p", { "data-qa": "field-description" }, slots.default?.()),
    }),
}));
vi.mock("@vueda/shell/field/FieldMessage.vue", () => ({
    default: defineComponent({
        name: "FieldMessage",
        props: ["messages", "severity"],
        setup: (props) => () => h("div", { "data-qa": "field-message", "data-severity": props.severity ?? "error" }),
    }),
}));
vi.mock("@vueda/widgets/WidgetCheckbox.vue", () => ({ default: SimpleStub("widget-checkbox") }));
vi.mock("@vueda/shell/separator/Separator.vue", () => ({ default: SimpleStub("shell-separator") }));

// Mock composable used by component
const useFieldSetTabularInline = vi.fn();
vi.mock("@vueda/use/useFieldSetTabularInline.js", () => ({
    FIELD_SET_TABULAR_INLINE_PROPS: {
        showCreateButton: { type: Boolean, default: true },
        readOnly: { type: Boolean, default: false },
        fieldProps: { type: Object, default: undefined },
    },
    FIELD_SET_TABULAR_INLINE_EMITS: [],
    useFieldSetTabularInline,
}));

vi.mock("@vueda/use/useDevLogger.js", () => ({
    useDevLogger: () => ({
        warn: warnSpy,
        log: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
    }),
}));

const FieldSetTabularInline = await import("@vueda/form/field-set/FieldSetTabularInline.vue").then((m) => m.default);

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
    const fieldSetContext = {
        state: reactive({
            value,
            label: "Label",
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
        setVisibility: vi.fn(),
        toggleVisibility: vi.fn(),
    });

    return mount(FieldSetTabularInline, { props: {}, ...mountOptions });
}

describe("lib/form/field-set/FieldSetTabularInline.vue", () => {
    afterEach(() => {
        warnSpy.mockClear();
        vi.clearAllMocks();
    });

    scopedIt("invokes custom actions with the selected row and tabular helpers", async () => {
        const callback = vi.fn();
        const action = { fieldName: "inspect", label: "Inspect", action: callback };
        const wrapper = mountWithContext([{ id: 1 }, { id: 2 }], { state: { actions: [action] } });
        await wrapper.get('[data-row="1"] [data-qa="control-button"]').trigger("click");
        expect(callback).toHaveBeenCalledExactlyOnceWith({
            objectGridFieldSlotProps: { pk: 2, rowIndex: 1 },
            action,
            fieldSetContextState: wrapper.vm.fieldSetTabularInline.fieldSetContext.state,
            rowValueName: "items[1]",
            event: expect.any(MouseEvent),
            doCreate: wrapper.vm.fieldSetTabularInline.doCreate,
        });
    });

    scopedIt("removes only the chosen unsaved row without destroy metadata", async () => {
        const wrapper = mountWithContext([{ id: 0 }, {}, {}]);
        expect(wrapper.find('[data-row="0"] [data-qa="control-button"]').exists()).toBe(false);
        const button = wrapper.get('[data-row="2"] [data-qa="control-button"]');
        expect(button.text()).toBe("Delete");
        await button.trigger("click");
        expect(wrapper.vm.fieldSetTabularInline.removeObject).toHaveBeenCalledExactlyOnceWith(2);
        expect(wrapper.vm.fieldSetTabularInline.handleSelected).not.toHaveBeenCalled();
    });

    scopedIt("keeps saved-row destroy selection separate from unsaved removal", async () => {
        const wrapper = mountWithContext([{ id: 0 }, {}], {
            state: { actions: [{ fieldName: "destroy", label: "Delete" }] },
        });
        const saved = wrapper.get('[data-row="0"]');
        expect(saved.find('[data-qa="control-button"]').exists()).toBe(false);
        saved.getComponent({ name: "widget-checkbox-stub" }).vm.$emit("update:model-value", true);
        expect(wrapper.vm.fieldSetTabularInline.handleSelected).toHaveBeenCalledExactlyOnceWith(true, 0);
        const unsaved = wrapper.get('[data-row="1"]');
        expect(unsaved.findAll('[data-qa="control-button"]')).toHaveLength(1);
        expect(unsaved.find('[data-qa="widget-checkbox"]').exists()).toBe(false);
        await unsaved.get('[data-qa="control-button"]').trigger("click");
        expect(wrapper.vm.fieldSetTabularInline.removeObject).toHaveBeenCalledExactlyOnceWith(1);
    });

    scopedIt("does not offer unsaved removal in read-only fieldsets", () => {
        for (const options of [{ props: { readOnly: true } }, { state: { computedFieldProps: { readOnly: true } } }]) {
            const wrapper = mountWithContext([{}], options);
            expect(wrapper.find('[data-row="0"] [data-qa="control-button"]').exists()).toBe(false);
        }
    });

    scopedIt("supports the destroy-button slot without server action metadata", async () => {
        const wrapper = mountWithContext([{}], {
            slots: {
                "destroy-button": (props) =>
                    h("button", { onClick: props.onClick }, `${props.label} ${props.rowIndex}`),
            },
        });
        const button = wrapper.get('[data-row="0"] button');
        expect(button.text()).toBe("Delete 0");
        await button.trigger("click");
        expect(wrapper.vm.fieldSetTabularInline.removeObject).toHaveBeenCalledExactlyOnceWith(0);
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

    scopedIt("requests visibility when the disclosure is clicked", async () => {
        const wrapper = mountWithContext([], {
            state: { hidable: true },
        });
        const titleBar = wrapper.find('[data-qa="field-set-tabular-inline-title-bar"]');
        expect(titleBar.element.tagName).toBe("BUTTON");
        expect(titleBar.attributes("aria-expanded")).toBe("true");
        await titleBar.trigger("click");
        expect(wrapper.vm.fieldSetTabularInline.setVisibility).toHaveBeenCalledWith(false);
    });
});
