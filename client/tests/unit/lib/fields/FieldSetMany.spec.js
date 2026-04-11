import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const ControlButtonStub = defineComponent({
    name: "ControlButtonStub",
    props: ["variant", "size"],
    emits: ["click"],
    setup(props, { emit, slots }) {
        return () =>
            h(
                "button",
                {
                    "data-qa": "control-button",
                    "data-variant": props.variant,
                    "data-size": props.size,
                    onClick: () => emit("click"),
                },
                slots.default?.(),
            );
    },
});

const ManyComponentStub = defineComponent({
    name: "ManyComponentStub",
    props: ["name", "required"],
    setup(props) {
        return () =>
            h("div", {
                "data-qa": "many-component",
                "data-name": props.name,
                "data-required": String(props.required),
            });
    },
});

const SlotButton = defineComponent({
    name: "SlotButton",
    emits: ["click"],
    setup(_, { emit }) {
        return () =>
            h("button", {
                "data-qa": "slot-destroy",
                onClick: () => emit("click"),
            });
    },
});

const warnSpy = vi.fn();
const useFieldMock = vi.fn();
const themeFn = vi.fn((cls) => `t-${cls}`);

vi.mock("@vueda/controls/button/ControlButton.vue", () => ({ default: ControlButtonStub }));
vi.mock("@vueda/shell/field/ShellFieldDescription.vue", () => ({
    default: defineComponent({
        name: "ShellFieldDescription",
        setup:
            (_, { slots }) =>
            () =>
                h("p", { "data-qa": "field-description" }, slots.default?.()),
    }),
}));
vi.mock("@vueda/shell/field/ShellFieldMessage.vue", () => ({
    default: defineComponent({
        name: "ShellFieldMessage",
        props: ["messages", "severity"],
        setup: (props) => () => h("div", { "data-qa": "field-message", "data-severity": props.severity ?? "error" }),
    }),
}));
vi.mock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: () => ({ warn: warnSpy }) }));
vi.mock("@vueda/use/useField.js", () => ({
    FIELD_EMITS: [],
    FIELD_PROPS: { name: { type: String, required: true } },
    useField: useFieldMock,
}));
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: vi.fn(() => themeFn), THEME_OVERRIDE_PROPS: {} }));

let FieldSetMany, vue;

beforeEach(async () => {
    vue = await import("vue");
    FieldSetMany = (await import("@vueda/fields/FieldSetMany.vue")).default;
    warnSpy.mockClear();
    useFieldMock.mockReset();
    themeFn.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/fields/FieldSetMany.vue", () => {
    scopedIt("warns when value is not an array", async () => {
        const fieldContext = {
            state: reactive({ name: "nums", label: "Nums", value: {}, help: "", errors: {}, messages: {} }),
        };
        useFieldMock.mockReturnValue(fieldContext);
        mount(FieldSetMany, { props: { name: "nums", manyComponent: ManyComponentStub } });
        await vue.nextTick();
        expect(warnSpy).toHaveBeenCalledWith(
            "Expected value to be an array or null/undefined, got:",
            fieldContext.state.value,
        );
        fieldContext.state.value = 1;
        await vue.nextTick();
        expect(warnSpy).toHaveBeenCalledTimes(2);
    });

    scopedIt("adds items and computes names", async () => {
        const fieldContext = {
            state: reactive({ name: "nums", label: "Nums", value: [1], help: "", errors: {}, messages: {} }),
        };
        useFieldMock.mockReturnValue(fieldContext);
        const wrapper = mount(FieldSetMany, { props: { name: "nums", manyComponent: ManyComponentStub } });
        expect(wrapper.findAll('[data-qa="many-component"]').length).toBe(1);
        await wrapper.find('[data-variant="outline"]').trigger("click");
        await vue.nextTick();
        expect(fieldContext.state.value).toEqual([1, undefined]);
        const comps = wrapper.findAll('[data-qa="many-component"]');
        expect(comps).toHaveLength(2);
        expect(comps[1].attributes("data-name")).toBe("nums[1]");
        expect(comps[1].attributes("data-required")).toBe("true");
    });

    scopedIt("destroys items when remove clicked", async () => {
        const fieldContext = {
            state: reactive({ name: "nums", label: "Nums", value: [1, 2], help: "", errors: {}, messages: {} }),
        };
        useFieldMock.mockReturnValue(fieldContext);
        const wrapper = mount(FieldSetMany, { props: { name: "nums", manyComponent: ManyComponentStub } });
        expect(wrapper.findAll('[data-qa="many-component"]').length).toBe(2);
        await wrapper.find('[data-size="icon-sm"]').trigger("click");
        await vue.nextTick();
        expect(fieldContext.state.value).toEqual([1]);
        expect(wrapper.findAll('[data-qa="many-component"]').length).toBe(1);
    });

    scopedIt("handles undefined value for add and destroy", async () => {
        const fieldContext = {
            state: reactive({ name: "nums", label: "Nums", value: undefined, help: "", errors: {}, messages: {} }),
        };
        useFieldMock.mockReturnValue(fieldContext);
        const wrapper = mount(FieldSetMany, { props: { name: "nums", manyComponent: ManyComponentStub } });

        await wrapper.find('[data-variant="outline"]').trigger("click");
        await vue.nextTick();
        expect(fieldContext.state.value).toEqual([undefined]);

        fieldContext.state.value = undefined;
        wrapper.vm.onDestroy(0);
        await vue.nextTick();
        expect(fieldContext.state.value).toEqual([]);
    });

    scopedIt("renders field-set-level-chores slot when provided", () => {
        const fieldContext = {
            state: reactive({
                name: "nums",
                label: "Nums",
                value: [1],
                help: "Default help",
                errors: { required: "Required" },
                messages: {},
            }),
        };
        useFieldMock.mockReturnValue(fieldContext);
        const wrapper = mount(FieldSetMany, {
            props: { name: "nums", manyComponent: ManyComponentStub },
            slots: {
                "field-set-level-chores": () => h("div", { "data-qa": "custom-chores" }, "Custom feedback"),
            },
        });
        expect(wrapper.find('[data-qa="custom-chores"]').exists()).toBe(true);
        expect(wrapper.find('[data-qa="custom-chores"]').text()).toBe("Custom feedback");
        expect(wrapper.find('[data-qa="field-description"]').exists()).toBe(false);
        expect(wrapper.find('[data-qa="field-message"]').exists()).toBe(false);
    });

    scopedIt("destroys items when slot clicked", async () => {
        const fieldContext = {
            state: reactive({ name: "nums", label: "Nums", value: [1, 2], help: "", errors: {}, messages: {} }),
        };
        useFieldMock.mockReturnValue(fieldContext);
        const wrapper = mount(FieldSetMany, {
            props: { name: "nums", manyComponent: ManyComponentStub },
            slots: { destroy: ({ onClick }) => h(SlotButton, { onClick }) },
        });
        expect(wrapper.findAll('[data-qa="many-component"]').length).toBe(2);
        await wrapper.getComponent(SlotButton).trigger("click");
        await vue.nextTick();
        expect(fieldContext.state.value).toEqual([1]);
        expect(wrapper.findAll('[data-qa="many-component"]').length).toBe(1);
    });
});
