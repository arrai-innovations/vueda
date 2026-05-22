import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseForm = vi.fn();
vi.mock("@vueda/use/useForm.js", () => ({
    useForm: mockedUseForm,
}));

const mockedUseLookupContext = vi.fn();
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));

const mockedUseWarnings = vi.fn();
vi.mock("@vueda/use/useWarnings.js", () => ({
    useWarnings: mockedUseWarnings,
}));

const mockedUseTheme = vi.fn(() => (key) => (key === "root" ? "theme-root" : ""));
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

vi.mock("@vueda/utils/case.js", () => ({
    memoizedStartCase: (v) => v.toUpperCase(),
}));

const routerBack = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ back: routerBack }),
}));

const ModelActionFormStub = defineComponent({
    name: "ModelActionFormStub",
    props: ["app", "model", "action"],
    setup(props, { attrs, slots }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "model-action-form",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-action": props.action,
                    ...attrs,
                },
                Object.keys(slots).map((name) => h("div", { "data-slot": name }, slots[name] ? slots[name]() : null)),
            );
    },
});
vi.mock("@vueda/components/ModelActionForm.vue", () => ({
    default: ModelActionFormStub,
}));

const ButtonStub = defineComponent({
    name: "ButtonStub",
    emits: ["click"],
    setup(_, { emit, slots }) {
        return () =>
            h(
                "button",
                {
                    "data-qa": "prime-button",
                    onClick: () => emit("click"),
                },
                slots.default?.(),
            );
    },
});
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));

const PageTitleStub = defineComponent({
    name: "PageTitleStub",
    props: ["title"],
    setup(props, { slots }) {
        return () =>
            h(
                "div",
                { "data-qa": "page-title", "data-title": props.title },
                Object.keys(slots).map((name) => h("div", { "data-slot": name }, slots[name] ? slots[name]() : null)),
            );
    },
});
vi.mock("@vueda/components/PageTitle.vue", () => ({
    default: PageTitleStub,
}));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return {
        __esModule: true,
        ...actual,
        inject: mockedInject,
        provide: mockedProvide,
    };
});

let ViewAction, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    ViewAction = (await import("@vueda/views/ViewAction.vue")).default;
    mockedUseForm.mockClear();
    mockedUseLookupContext.mockClear();
    mockedUseWarnings.mockClear();
    mockedUseTheme.mockClear();
    routerBack.mockClear();
    provideStore.clear();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewAction, { props: { app: "app", model: "model", action: "do" } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("does not call useLookupContext when lookup context exists", () => {
    mockedInject.mockReturnValueOnce({});
    mount(ViewAction, { props: { app: "app", model: "model", action: "do" } });
    expect(mockedUseLookupContext).not.toHaveBeenCalled();
});

scopedIt("passes props and attrs to ActionForm, sets title and forwards slots", () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewAction, {
        props: {
            app: "myApp",
            model: "person",
            action: "edit",
            pk: ["id1", "id2"],
            class: "custom",
        },
        attrs: { foo: "bar" },
        slots: {
            extra: "<span>extra</span>",
            "return-button": "<button data-qa='custom-return'>custom</button>",
        },
    });

    const root = wrapper.find('[data-qa="view-action-root"]');
    expect(root.classes()).toContain("theme-root");
    expect(root.classes()).toContain("custom");

    const page = wrapper.find('[data-qa="page-title"]');
    expect(page.attributes("data-title")).toBe("EDIT PERSON");
    expect(page.find('[data-slot="button"] [data-qa="custom-return"]').exists()).toBe(true);

    const af = wrapper.find('[data-qa="model-action-form"]');
    expect(af.attributes("data-app")).toBe("myApp");
    expect(af.attributes("data-model")).toBe("person");
    expect(af.attributes("data-action")).toBe("edit");
    expect(af.attributes("foo")).toBe("bar");
    expect(af.find('[data-slot="extra"]').text()).toBe("extra");

    const formArg = mockedUseForm.mock.calls[0][0];
    expect(vue.isReactive(formArg)).toBe(false);
    expect(vue.isRef(formArg.initialValues)).toBe(true);
    expect(formArg.initialValues.value).toEqual({ id1: null, id2: null });
    expect(mockedUseTheme).toHaveBeenCalledWith("ViewAction", expect.any(Object));
});

scopedIt("calls router.back when return button clicked", async () => {
    mockedInject.mockReturnValueOnce({});
    const wrapper = mount(ViewAction, {
        props: { app: "a", model: "b", action: "c" },
    });

    await wrapper.find('[data-qa="prime-button"]').trigger("click");
    expect(routerBack).toHaveBeenCalled();
});

scopedIt("initialValues uses pk string when provided", () => {
    mockedInject.mockReturnValueOnce({});
    mount(ViewAction, { props: { app: "app", model: "model", action: "do", pk: "identifier" } });
    const formArg = mockedUseForm.mock.calls[0][0];
    expect(formArg.initialValues.value).toEqual({ identifier: null });
});

scopedIt("initialFormValues override computed initial values", () => {
    mockedInject.mockReturnValueOnce({});
    const initialFormValues = { custom: "value" };
    mount(ViewAction, {
        props: { app: "app", model: "model", action: "do", initialFormValues },
    });
    const formArg = mockedUseForm.mock.calls[0][0];
    expect(formArg.initialValues.value).toStrictEqual(initialFormValues);
});
