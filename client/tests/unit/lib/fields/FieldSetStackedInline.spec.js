import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick, reactive } from "vue";

const RowStub = defineComponent({
    name: "RowStub",
    props: ["index", "fieldName", "pk", "readOnly", "fieldSetContextState"],
    emits: ["destroy-row", "update:selected"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "row-stub", "data-index": props.index }, slots.default ? slots.default() : null);
    },
});

const ControlButtonStub = defineComponent({
    name: "ControlButtonStub",
    props: ["variant", "size"],
    emits: ["click"],
    setup(props, { emit, slots }) {
        return () =>
            h(
                "button",
                { "data-qa": "button-stub", "data-variant": props.variant, onClick: () => emit("click") },
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

let FieldSetStackedInline, useField, useFieldSetInline, useTheme;
const warnSpy = vi.fn();

describe("lib/fields/FieldSetStackedInline.vue", () => {
    beforeEach(async () => {
        vi.doMock("@vueda/components/FieldSetStackedInlineRow.vue", () => ({ default: RowStub }));
        vi.doMock("@vueda/controls/button/Button.vue", () => ({ default: ControlButtonStub }));
        vi.doMock("@vueda/shell/field/FieldDescription.vue", () => ({
            default: defineComponent({
                name: "FieldDescription",
                setup:
                    (_, { slots }) =>
                    () =>
                        h("p", { "data-qa": "field-description" }, slots.default?.()),
            }),
        }));
        vi.doMock("@vueda/shell/field/FieldMessage.vue", () => ({
            default: defineComponent({
                name: "FieldMessage",
                props: ["messages", "severity"],
                setup: (props) => () =>
                    h("div", { "data-qa": "field-message", "data-severity": props.severity ?? "error" }),
            }),
        }));
        vi.doMock("@vueda/shell/separator/Separator.vue", () => ({ default: ShellSeparatorStub }));

        useField = vi.fn();
        useFieldSetInline = vi.fn();
        const themeFn = vi.fn(() => "t");
        useTheme = vi.fn(() => themeFn);

        vi.doMock("@vueda/use/useField.js", () => ({ FIELD_EMITS: [], useField }));
        vi.doMock("@vueda/use/useFieldSetInline.js", () => ({ FIELD_SET_INLINE_PROPS: {}, useFieldSetInline }));
        vi.doMock("@vueda/use/useTheme.js", () => ({ useTheme, THEME_OVERRIDE_PROPS: {} }));
        vi.doMock("@vueda/use/useDevLogger.js", () => ({
            useDevLogger: () => ({
                warn: warnSpy,
                log: vi.fn(),
                error: vi.fn(),
                info: vi.fn(),
                debug: vi.fn(),
            }),
        }));
        FieldSetStackedInline = (await import("@vueda/fields/FieldSetStackedInline.vue")).default;
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        warnSpy.mockClear();
    });

    scopedIt("logs warnings for invalid value", async () => {
        const fieldSetContext = {
            state: reactive({ name: "fs", label: "FS", value: {}, help: "", errors: {}, messages: {} }),
        };
        const fieldSetInline = {
            state: reactive({
                hidable: false,
                internalVisible: true,
                computedFieldProps: {},
                showCreateButton: false,
                remainingSlotNames: [],
            }),
            resolvedSlotNames: {
                "create-button": { name: "create" },
                "toggle-button": { name: "toggle" },
                "field-set-level-chores": { name: "chores" },
                title: { name: "title" },
                "empty-state": { name: "empty-state" },
            },
        };
        useField.mockReturnValue(fieldSetContext);
        useFieldSetInline.mockReturnValue(fieldSetInline);

        mount(FieldSetStackedInline, { props: {} });
        expect(warnSpy).toHaveBeenCalledWith(
            "Expected value to be an array of objects, got:",
            fieldSetContext.state.value,
        );

        warnSpy.mockClear();
        fieldSetContext.state.value = [1, { id: 2 }];
        await nextTick();
        expect(warnSpy).toHaveBeenCalledWith("Array contains non-object elements:", 1);

        warnSpy.mockClear();
        fieldSetContext.state.value = [null, { id: 2 }];
        await nextTick();
        expect(warnSpy).toHaveBeenCalledWith("Array contains non-object elements:", null);

        warnSpy.mockClear();
        fieldSetContext.state.value = [[1], { id: 2 }];
        await nextTick();
        expect(warnSpy).toHaveBeenCalledWith("Array contains non-object elements:", [1]);
    });

    scopedIt("renders create button and triggers handler", async () => {
        const fieldSetContext = {
            state: reactive({ name: "fs", label: "FS", value: [], help: "", errors: {}, messages: {} }),
        };
        const fieldSetInline = {
            state: reactive({
                hidable: false,
                internalVisible: true,
                computedFieldProps: {},
                showCreateButton: true,
                remainingSlotNames: [],
            }),
            doCreate: vi.fn(),
            resolvedSlotNames: {
                "create-button": { name: "create" },
                "toggle-button": { name: "toggle" },
                "field-set-level-chores": { name: "chores" },
                title: { name: "title" },
                "empty-state": { name: "empty-state" },
            },
        };
        useField.mockReturnValue(fieldSetContext);
        useFieldSetInline.mockReturnValue(fieldSetInline);

        const wrapper = mount(FieldSetStackedInline, { props: {} });
        const buttons = wrapper.findAll('[data-qa="button-stub"]');
        const createBtn = buttons.find((b) => b.text().includes("Create"));
        expect(createBtn.exists()).toBe(true);
        await createBtn.trigger("click");
        expect(fieldSetInline.doCreate).toHaveBeenCalled();
    });

    scopedIt("does not warn for null or undefined value", async () => {
        const fieldSetContext = {
            state: reactive({ name: "fs", label: "FS", value: null, help: "", errors: {}, messages: {} }),
        };
        const fieldSetInline = {
            state: reactive({
                hidable: false,
                internalVisible: true,
                computedFieldProps: {},
                showCreateButton: false,
                remainingSlotNames: [],
            }),
            resolvedSlotNames: {
                "create-button": { name: "create" },
                "toggle-button": { name: "toggle" },
                "field-set-level-chores": { name: "chores" },
                title: { name: "title" },
                "empty-state": { name: "empty-state" },
            },
        };
        useField.mockReturnValue(fieldSetContext);
        useFieldSetInline.mockReturnValue(fieldSetInline);

        mount(FieldSetStackedInline, { props: {} });
        expect(warnSpy).not.toHaveBeenCalled();

        fieldSetContext.state.value = undefined;
        await nextTick();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    scopedIt("slot interactions trigger handlers", async () => {
        const fieldSetContext = {
            state: reactive({ name: "fs", label: "FS", value: [{ id: 1 }], help: "", errors: {}, messages: {} }),
        };
        const fieldSetInline = {
            state: reactive({
                hidable: true,
                internalVisible: true,
                computedFieldProps: {},
                showCreateButton: true,
                remainingSlotNames: ["custom"],
            }),
            toggleVisibility: vi.fn(),
            doCreate: vi.fn(),
            removeObject: vi.fn(),
            handleSelected: vi.fn(),
            resolvedSlotNames: {
                "create-button": { name: "create" },
                "toggle-button": { name: "toggle" },
                "field-set-level-chores": { name: "chores" },
                title: { name: "title" },
                "empty-state": { name: "empty-state" },
            },
        };
        useField.mockReturnValue(fieldSetContext);
        useFieldSetInline.mockReturnValue(fieldSetInline);

        const wrapper = mount(FieldSetStackedInline, {
            props: {},
            slots: {
                toggle: '<button data-qa="toggle-slot" />',
                create: '<button data-qa="create-slot" />',
                custom: '<span data-qa="row-custom" />',
            },
        });

        expect(wrapper.get('[data-qa="toggle-slot"]').exists()).toBe(true);
        fieldSetInline.toggleVisibility();
        expect(fieldSetInline.toggleVisibility).toHaveBeenCalled();

        expect(wrapper.get('[data-qa="create-slot"]').exists()).toBe(true);
        fieldSetInline.doCreate();
        expect(fieldSetInline.doCreate).toHaveBeenCalled();

        const row = wrapper.getComponent(RowStub);
        row.vm.$emit("destroy-row");
        row.vm.$emit("update:selected", true);
        await nextTick();
        expect(fieldSetInline.removeObject).toHaveBeenCalledWith(0);
        expect(fieldSetInline.handleSelected).toHaveBeenCalledWith(true, 0);
    });
});
