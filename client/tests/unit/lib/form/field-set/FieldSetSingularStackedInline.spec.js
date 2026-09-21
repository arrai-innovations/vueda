import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const ControlButtonStub = defineComponent({
    name: "ControlButtonStub",
    props: ["tone", "emphasis", "size"],
    emits: ["click"],
    setup(props, { emit, slots }) {
        return () =>
            h(
                "button",
                {
                    "data-qa": "button-stub",
                    "data-tone": props.tone,
                    "data-emphasis": props.emphasis,
                    onClick: () => emit("click"),
                },
                slots.default?.(),
            );
    },
});

const ShellSeparatorStub = defineComponent({
    name: "ShellSeparatorStub",
    setup() {
        return () => h("hr", { "data-qa": "separator-stub" });
    },
});

const InlineRowStub = defineComponent({
    name: "InlineRowStub",
    emits: ["destroy-row", "update:selected"],
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "inline-row-stub" }, slots.default ? slots.default() : null);
    },
});

vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ControlButtonStub }));
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
vi.mock("@vueda/shell/separator/Separator.vue", () => ({ default: ShellSeparatorStub }));
vi.mock("@vueda/form/field-set/FieldSetStackedInlineRow.vue", () => ({ default: InlineRowStub }));

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({ slotResolver: () => "theme" });
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));

let fieldState, fieldSetContext;
const mockedUseField = vi.fn(() => fieldSetContext);
vi.mock("@vueda/use/useField.js", () => ({ FIELD_EMITS: [], useField: mockedUseField }));

const inlineState = reactive({
    hidable: false,
    internalVisible: true,
    showCreateButton: true,
    computedFieldProps: {},
    remainingSlotNames: [],
    selected: { value: [] },
});
const emptyObject = { empty: true };
const toggleVisibility = vi.fn();
const updateInitialValue = vi.fn();
const mockedUseFieldSetInline = vi.fn(() => ({
    state: inlineState,
    resolvedSlotNames: {
        "toggle-button": { name: "toggle-button" },
        "create-button": { name: "create-button" },
        "field-set-level-chores": { name: "field-set-level-chores" },
        title: { name: "title" },
        "empty-state": { name: "empty-state" },
    },
    getEmptyFieldObject: () => emptyObject,
    toggleVisibility,
}));
vi.mock("@vueda/use/useFieldSetInline.js", () => ({
    FIELD_SET_INLINE_PROPS: {},
    useFieldSetInline: mockedUseFieldSetInline,
}));

const logger = { warn: vi.fn() };
vi.mock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: vi.fn(() => logger) }));

describe("lib/form/field-set/FieldSetSingularStackedInline.vue", () => {
    let FieldSetSingularStackedInline, vue;

    beforeEach(async () => {
        vue = await vi.importActual("vue");
        fieldState = vue.reactive({ name: "fs", label: "FS", value: null, help: "", errors: {}, messages: {} });
        fieldSetContext = {
            state: fieldState,
            blur: vi.fn(),
            ignore: vi.fn(),
            removeIgnore: vi.fn(),
            updateInitialValue,
        };
        FieldSetSingularStackedInline = (await import("@vueda/form/field-set/FieldSetSingularStackedInline.vue"))
            .default;
        logger.warn.mockClear();
        fieldSetContext.blur.mockClear();
        fieldSetContext.ignore.mockClear();
        fieldSetContext.removeIgnore.mockClear();
        inlineState.selected.value = [];
    });

    scopedIt("creates inline object when fieldObjects is ready", async () => {
        inlineState.fieldObjects = [];
        mount(FieldSetSingularStackedInline, { props: { autoCreateWhenEmpty: true } });
        await vue.nextTick();
        expect(fieldSetContext.blur).not.toHaveBeenCalled();
        expect(updateInitialValue).not.toHaveBeenCalled();
        expect(fieldState.value).toBe(null);

        inlineState.fieldObjects = [{ name: "test" }];
        await vue.nextTick();

        expect(fieldState.value).toEqual(emptyObject);
        expect(fieldSetContext.blur).toHaveBeenCalled();
        expect(updateInitialValue).toHaveBeenCalled();
    });

    scopedIt("clearField clears value and blurs", () => {
        const wrapper = mount(FieldSetSingularStackedInline);
        fieldState.value = { id: 1 };
        wrapper.vm.clearField();
        expect(fieldSetContext.blur).toHaveBeenCalled();
        expect(fieldState.value).toBe(null);
    });

    scopedIt("clears an unsaved object when its row emits destroy-row", async () => {
        fieldState.value = { title: "Unsaved" };
        const wrapper = mount(FieldSetSingularStackedInline, { props: { autoCreateWhenEmpty: false } });
        wrapper.getComponent(InlineRowStub).vm.$emit("destroy-row");
        await vue.nextTick();
        expect(fieldState.value).toBe(null);
        expect(fieldSetContext.blur).toHaveBeenCalled();
        expect(wrapper.findComponent(InlineRowStub).exists()).toBe(false);
        expect(wrapper.get('[data-qa="button-stub"]').text()).toBe("Create");
    });

    scopedIt("handleDeleteSingle toggles ignore", () => {
        const wrapper = mount(FieldSetSingularStackedInline);
        wrapper.vm.handleDeleteSingle([2]);
        expect(fieldSetContext.ignore).toHaveBeenCalled();
        expect(inlineState.selected.value).toEqual([2]);
        wrapper.vm.handleDeleteSingle([]);
        expect(fieldSetContext.removeIgnore).toHaveBeenCalled();
    });

    scopedIt("warns when value is not object", async () => {
        fieldState.value = 5;
        mount(FieldSetSingularStackedInline);
        await vue.nextTick();
        expect(logger.warn).toHaveBeenCalled();
        logger.warn.mockClear();
        fieldState.value = { id: 3 };
        await vue.nextTick();
        expect(logger.warn).not.toHaveBeenCalled();
    });

    scopedIt("does not auto create when autoCreateWhenEmpty is false", async () => {
        mount(FieldSetSingularStackedInline, { props: { autoCreateWhenEmpty: false } });
        await vue.nextTick();
        expect(fieldSetContext.blur).not.toHaveBeenCalled();
        expect(fieldState.value).toBe(null);
    });

    scopedIt("toggleVisibility called when slot button clicked", async () => {
        inlineState.hidable = true;
        const wrapper = mount(FieldSetSingularStackedInline, {
            slots: {
                "toggle-button": (slotProps) => h("button", { "data-qa": "toggle-slot", ...slotProps }),
            },
        });
        await vue.nextTick();
        await wrapper.get('[data-qa="toggle-slot"]').trigger("click");
        expect(toggleVisibility).toHaveBeenCalled();
    });
});
