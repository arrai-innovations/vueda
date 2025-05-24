import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["label", "icon", "rounded"],
    emits: ["click"],
    setup(props, { emit }) {
        return () =>
            h("button", {
                "data-qa": "prime-button",
                "data-label": props.label,
                "data-icon": props.icon,
                "data-rounded": String(props.rounded),
                onClick: () => emit("click"),
            });
    },
});

const FormChoresStub = defineComponent({
    name: "FormChoresStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "form-chores" }, slots.default ? slots.default() : null);
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

const warnSpy = vi.fn();
const useFieldMock = vi.fn();
const themeFn = vi.fn((cls) => `t-${cls}`);

vi.mock("primevue/button", () => ({ default: ButtonStub }));
vi.mock("@vueda/components/FormChores.vue", () => ({ default: FormChoresStub }));
vi.mock("@vueda/use/useDevLogger.js", () => ({ useDevLogger: () => ({ warn: warnSpy }) }));
vi.mock("@vueda/use/useField.js", () => ({
    FIELD_EMITS: [],
    FIELD_PROPS: { name: { type: String, required: true } },
    useField: useFieldMock,
}));
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: vi.fn(() => themeFn), THEME_OVERRIDE_PROPS: {} }));
vi.mock("@vueda/utils/buildForm.js", () => ({ getFormChoresSlotNames: () => [] }));

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
        const fieldContext = { state: reactive({ name: "nums", label: "Nums", value: {} }) };
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
        const fieldContext = { state: reactive({ name: "nums", label: "Nums", value: [1] }) };
        useFieldMock.mockReturnValue(fieldContext);
        const wrapper = mount(FieldSetMany, { props: { name: "nums", manyComponent: ManyComponentStub } });
        expect(wrapper.findAll('[data-qa="many-component"]').length).toBe(1);
        await wrapper.find('[data-label="add"]').trigger("click");
        await vue.nextTick();
        expect(fieldContext.state.value).toEqual([1, undefined]);
        const comps = wrapper.findAll('[data-qa="many-component"]');
        expect(comps).toHaveLength(2);
        expect(comps[1].attributes("data-name")).toBe("nums[1]");
        expect(comps[1].attributes("data-required")).toBe("true");
    });

    scopedIt("destroys items when remove clicked", async () => {
        const fieldContext = { state: reactive({ name: "nums", label: "Nums", value: [1, 2] }) };
        useFieldMock.mockReturnValue(fieldContext);
        const wrapper = mount(FieldSetMany, { props: { name: "nums", manyComponent: ManyComponentStub } });
        expect(wrapper.findAll('[data-qa="many-component"]').length).toBe(2);
        await wrapper.find('[data-icon="pi pi-times"]').trigger("click");
        await vue.nextTick();
        expect(fieldContext.state.value).toEqual([1]);
        expect(wrapper.findAll('[data-qa="many-component"]').length).toBe(1);
    });
});
