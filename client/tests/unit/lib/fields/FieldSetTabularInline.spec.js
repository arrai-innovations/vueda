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

vi.mock("@vueda/components/FieldRenderer.vue", () => ({ default: SimpleStub("field-renderer") }));
vi.mock("@vueda/components/ObjectsGrid.vue", () => ({ default: SimpleStub("objects-grid") }));
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

    scopedIt("emits toggleVisibility when title bar is clicked", async () => {
        const wrapper = mountWithContext([], {
            state: { hidable: true },
        });
        const titleBar = wrapper.find('[data-qa="field-set-tabular-inline-title-bar"]');
        expect(titleBar.attributes("role")).toBe("button");
        expect(titleBar.attributes("aria-expanded")).toBe("true");
        await titleBar.trigger("click");
        expect(wrapper.vm.fieldSetTabularInline.toggleVisibility).toHaveBeenCalled();
    });
});
