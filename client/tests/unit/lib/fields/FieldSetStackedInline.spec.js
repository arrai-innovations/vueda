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

const FormChoresStub = defineComponent({
    name: "FormChoresStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "form-chores-stub" }, slots.default ? slots.default() : null);
    },
});

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["label"],
    emits: ["click"],
    setup(props, { emit }) {
        return () => h("button", { "data-qa": "button-stub", "data-label": props.label, onClick: () => emit("click") });
    },
});

const DividerStub = defineComponent({
    name: "DividerStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "divider-stub" }, slots.default ? slots.default() : null);
    },
});

let FieldSetStackedInline, useField, useFieldSetInline, useTheme;

describe("lib/fields/FieldSetStackedInline.vue", () => {
    beforeEach(async () => {
        vi.doMock("@vueda/components/FieldSetStackedInlineRow.vue", () => ({ default: RowStub }));
        vi.doMock("@vueda/components/FormChores.vue", () => ({ default: FormChoresStub }));
        vi.doMock("primevue/button", () => ({ default: ButtonStub }));
        vi.doMock("primevue/divider", () => ({ default: DividerStub }));

        useField = vi.fn();
        useFieldSetInline = vi.fn();
        const themeFn = vi.fn(() => "t");
        useTheme = vi.fn(() => themeFn);

        vi.doMock("@vueda/use/useField.js", () => ({ FIELD_EMITS: [], useField }));
        vi.doMock("@vueda/use/useFieldSetInline.js", () => ({ FIELD_SET_INLINE_PROPS: {}, useFieldSetInline }));
        vi.doMock("@vueda/use/useTheme.js", () => ({ useTheme, THEME_OVERRIDE_PROPS: {} }));
        vi.doMock("@vueda/utils/buildForm.js", () => ({ getFormChoresSlotNames: vi.fn(() => []) }));

        globalThis.logger = { warn: vi.fn() };

        FieldSetStackedInline = (await import("@vueda/fields/FieldSetStackedInline.vue")).default;
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        delete globalThis.logger;
    });

    scopedIt("logs warnings for invalid value", async () => {
        const fieldSetContext = { state: reactive({ name: "fs", label: "FS", value: {} }) };
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
            },
        };
        useField.mockReturnValue(fieldSetContext);
        useFieldSetInline.mockReturnValue(fieldSetInline);

        mount(FieldSetStackedInline, { props: {} });
        expect(globalThis.logger.warn).toHaveBeenCalledWith(
            "Expected value to be an array of objects, got:",
            fieldSetContext.state.value,
        );

        globalThis.logger.warn.mockClear();
        fieldSetContext.state.value = [1, { id: 2 }];
        await nextTick();
        expect(globalThis.logger.warn).toHaveBeenCalledWith("Array contains non-object elements:", 1);

        globalThis.logger.warn.mockClear();
        fieldSetContext.state.value = [null, { id: 2 }];
        await nextTick();
        expect(globalThis.logger.warn).toHaveBeenCalledWith("Array contains non-object elements:", null);

        globalThis.logger.warn.mockClear();
        fieldSetContext.state.value = [[1], { id: 2 }];
        await nextTick();
        expect(globalThis.logger.warn).toHaveBeenCalledWith("Array contains non-object elements:", [1]);
    });

    scopedIt("renders create button and triggers handler", async () => {
        const fieldSetContext = { state: reactive({ name: "fs", label: "FS", value: [] }) };
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
            },
        };
        useField.mockReturnValue(fieldSetContext);
        useFieldSetInline.mockReturnValue(fieldSetInline);

        const wrapper = mount(FieldSetStackedInline, { props: {} });
        const btn = wrapper.get('[data-qa="button-stub"]');
        expect(btn.attributes("data-label")).toBe("Create");
        await btn.trigger("click");
        expect(fieldSetInline.doCreate).toHaveBeenCalled();
    });

    scopedIt("does not warn for null or undefined value", async () => {
        const fieldSetContext = { state: reactive({ name: "fs", label: "FS", value: null }) };
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
            },
        };
        useField.mockReturnValue(fieldSetContext);
        useFieldSetInline.mockReturnValue(fieldSetInline);

        mount(FieldSetStackedInline, { props: {} });
        expect(globalThis.logger.warn).not.toHaveBeenCalled();

        fieldSetContext.state.value = undefined;
        await nextTick();
        expect(globalThis.logger.warn).not.toHaveBeenCalled();
    });

    scopedIt("slot interactions trigger handlers", async () => {
        const fieldSetContext = {
            state: reactive({ name: "fs", label: "FS", value: [{ id: 1 }] }),
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
