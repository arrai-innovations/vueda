import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

const FieldRendererStub = defineComponent({
    name: "FieldRendererStub",
    props: ["formModel", "formModelName", "fieldProps"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                { "data-qa": "field-renderer", "data-name": props.formModelName },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]() : null)),
            );
    },
});

const FormMessageStub = defineComponent({
    name: "FormMessageStub",
    props: ["type"],
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "form-message" }, slots.default ? slots.default() : null);
    },
});

const LoadingSpinnerBlockStub = defineComponent({
    name: "LoadingSpinnerBlockStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "loading-spinner-block", ...attrs });
    },
});

const { makeThemeFn, makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const themeFn = makeThemeFn({ slotResolver: (k) => `theme-${k}` });
const mockedUseTheme = makeUseThemeMock({ themeFn });
const mockedUseFormModel = vi.fn();

vi.mock("@vueda/form/form-model/FieldRenderer.vue", () => ({ default: FieldRendererStub }));
vi.mock("@vueda/form/form-model/FormMessage.vue", () => ({ default: FormMessageStub }));
vi.mock("@vueda/display/loading/LoadingSpinnerBlock.vue", () => ({ default: LoadingSpinnerBlockStub }));
vi.mock("@vueda/use/useTheme.js", () => ({ useTheme: mockedUseTheme, THEME_OVERRIDE_PROPS: {} }));
vi.mock("@vueda/use/useFormModel.js", () => ({ useFormModel: mockedUseFormModel }));

describe("lib/form/form-model/FormModel.vue", () => {
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
        themeFn.mockClear();
        mockedUseTheme.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("calls useTheme and useFormModel", () => {
        mount(FormModel, { props: { app: "a", model: "m" } });
        expect(mockedUseTheme).toHaveBeenCalledWith("FormModel", expect.any(Object));
        expect(mockedUseFormModel).toHaveBeenCalledWith(expect.any(Object));
    });

    scopedIt("shows spinner when no fields", () => {
        const wrapper = mount(FormModel, { props: { app: "a", model: "m" } });
        expect(wrapper.get('[data-qa="loading-spinner-block"]').exists()).toBe(true);
        expect(wrapper.text()).toContain("Loading model information.");
    });

    scopedIt("renders fields and slots", () => {
        mockedUseFormModel.mockReturnValueOnce(
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
        const wrapper = mount(FormModel, {
            props: { app: "a", model: "m" },
            slots: {
                "before-fields": "<div data-qa='before-slot'>B</div>",
                "after-fields": "<div data-qa='after-slot'>A</div>",
                foo: "<span data-qa='foo-slot'>foo</span>",
            },
        });

        const fields = wrapper.findAllComponents(FieldRendererStub);
        expect(fields).toHaveLength(1);
        expect(wrapper.find(".theme-beforeFields").exists()).toBe(true);
        expect(wrapper.find(".theme-afterFields").exists()).toBe(true);
        expect(fields[0].find('[data-slot="foo"] [data-qa="foo-slot"]').exists()).toBe(true);
        expect(wrapper.classes()).toContain("theme-root");
    });
});
