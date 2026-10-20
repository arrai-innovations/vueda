import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { clearThemeOverrides, overrideTheme } from "@vueda/use/useTheme.js";
import { defineComponent, h, nextTick, reactive } from "vue";

// Unlike FormModel.spec.js, this spec keeps the real useTheme, so it asserts on the classes that a registered
// FormModel theme entry resolves to.

const EmptyStub = defineComponent({
    name: "EmptyStub",
    setup() {
        return () => h("div");
    },
});

const mockedUseFormModel = vi.fn();

vi.mock("@vueda/form/form-model/FieldRenderer.vue", () => ({ default: EmptyStub }));
vi.mock("@vueda/form/form-model/FormMessage.vue", () => ({ default: EmptyStub }));
vi.mock("@vueda/use/useFormModel.js", () => ({ useFormModel: mockedUseFormModel }));

describe("lib/form/form-model/FormModel.vue theme variant", () => {
    let FormModel;

    beforeEach(async () => {
        mockedUseFormModel.mockReturnValue(
            reactive({
                fields: [],
                baseFieldNames: [],
                fieldComponents: {},
                fieldProps: {},
                fieldDetails: {},
                widgetComponents: {},
                widgetProps: {},
            }),
        );
        FormModel = (await import("@vueda/form/form-model/FormModel.vue")).default;
    });

    afterEach(() => {
        clearThemeOverrides();
        vi.clearAllMocks();
    });

    const rootClasses = (wrapper) => wrapper.get('[data-qa="form-model"]').classes();

    scopedIt("resolves a variant-aware entry against the passed variant", () => {
        overrideTheme({ FormModel: { root: ({ variant }) => ({ class: [`form-${variant}`] }) } });
        const wrapper = mount(FormModel, { props: { app: "a", model: "m", variant: "compact" } });
        expect(rootClasses(wrapper)).toContain("form-compact");
    });

    scopedIt("resolves different classes for a different variant", () => {
        overrideTheme({
            FormModel: { root: ({ variant }) => ({ class: [variant === "grid" ? "grid grid-cols-2" : "flex"] }) },
        });
        const grid = mount(FormModel, { props: { app: "a", model: "m", variant: "grid" } });
        const plain = mount(FormModel, { props: { app: "a", model: "m", variant: "stacked" } });
        expect(rootClasses(grid)).toEqual(expect.arrayContaining(["grid", "grid-cols-2"]));
        expect(rootClasses(plain)).toContain("flex");
        expect(rootClasses(plain)).not.toContain("grid");
    });

    scopedIt("passes the default variant when none is set", () => {
        overrideTheme({ FormModel: { root: ({ variant }) => ({ class: [`form-${variant}`] }) } });
        const wrapper = mount(FormModel, { props: { app: "a", model: "m" } });
        expect(rootClasses(wrapper)).toContain("form-default");
    });

    scopedIt("re-resolves the entry when the variant changes after mount", async () => {
        overrideTheme({ FormModel: { root: ({ variant }) => ({ class: [`form-${variant}`] }) } });
        const wrapper = mount(FormModel, { props: { app: "a", model: "m", variant: "compact" } });
        await wrapper.setProps({ variant: "wide" });
        await nextTick();
        expect(rootClasses(wrapper)).toContain("form-wide");
        expect(rootClasses(wrapper)).not.toContain("form-compact");
    });

    scopedIt("resolves entries that are not functions as before", () => {
        mockedUseFormModel.mockReturnValue(
            reactive({
                fields: ["name"],
                baseFieldNames: ["name"],
                fieldComponents: {},
                fieldProps: {},
                fieldDetails: {},
                widgetComponents: {},
                widgetProps: {},
            }),
        );
        overrideTheme({ FormModel: { root: { class: ["plain-root"] } } });
        const wrapper = mount(FormModel, { props: { app: "a", model: "m", variant: "compact" } });
        expect(rootClasses(wrapper)).toEqual(["plain-root"]);
        // The base entry for the fields container.
        expect(wrapper.find(".gap-7").classes()).toEqual(["flex", "w-full", "flex-col", "gap-7"]);
    });
});
