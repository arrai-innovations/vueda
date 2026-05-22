import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseObject = vi.fn();
const mockedUseFilteredActions = vi.fn();
const mockedUseForm = vi.fn();
const mockedUseLookupContext = vi.fn();
const mockedUseModelConfig = vi.fn();
const mockedUseModelInitialValues = vi.fn();
const mockedUseObjectForm = vi.fn();

vi.mock("@arrai-innovations/reactive-helpers", () => ({
    useObject: mockedUseObject,
}));
vi.mock("@vueda/use/useFilteredActions.js", () => ({
    useFilteredActions: mockedUseFilteredActions,
}));
vi.mock("@vueda/use/useForm.js", () => ({
    useForm: mockedUseForm,
}));
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: mockedUseModelConfig,
}));
vi.mock("@vueda/use/useModelInitialValues.js", () => ({
    useModelInitialValues: mockedUseModelInitialValues,
}));
vi.mock("@vueda/use/useObjectForm.js", () => ({
    useObjectForm: mockedUseObjectForm,
}));
vi.mock("@vueda/utils/case.js", () => ({
    memoizedStartCase: (s) => s,
}));

const PageTitleStub = defineComponent({
    name: "PageTitleStub",
    setup(_, { slots, attrs }) {
        return () =>
            h(
                "div",
                { "data-qa": "page-title", ...attrs },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]() : null)),
            );
    },
});
const StickyBarStub = defineComponent({
    name: "StickyBarStub",
    setup(_, { slots, attrs }) {
        return () =>
            h("div", { "data-qa": "sticky-bar", ...attrs }, [
                slots.default ? slots.default() : null,
                slots.primary ? slots.primary() : null,
                slots.secondary ? slots.secondary() : null,
            ]);
    },
});
const FormModelStub = defineComponent({
    name: "FormModelStub",
    props: ["app", "model", "view", "variant"],
    setup(props, { slots, attrs }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "form-model",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-view": props.view,
                    ...attrs,
                },
                Object.keys(slots).map((n) => h("div", { "data-slot": n }, slots[n] ? slots[n]() : null)),
            );
    },
});
const ErrorDisplayStub = defineComponent({
    name: "ErrorDisplayStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "error-display", ...attrs });
    },
});
const LinkModelViewStub = defineComponent({
    name: "LinkModelViewStub",
    props: ["app", "model", "view", "label"],
    setup(props) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "link-model-view",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-view": props.view,
                },
                props.label,
            );
    },
});
const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["form", "loading", "type"],
    setup(props, { slots }) {
        return () =>
            h(
                "button",
                {
                    "data-qa": "button",
                    "data-form": props.form,
                    "data-loading": String(props.loading),
                    "data-type": props.type,
                },
                slots.default?.(),
            );
    },
});
const FeedbackSpinnerStub = defineComponent({
    name: "FeedbackSpinnerStub",
    setup() {
        return () => h("div", { "data-qa": "feedback-spinner" });
    },
});

vi.mock("@vueda/components/PageTitle.vue", () => ({ default: PageTitleStub }));
vi.mock("@vueda/components/StickyBar.vue", () => ({ default: StickyBarStub }));
vi.mock("@vueda/components/FormModel.vue", () => ({ default: FormModelStub }));
vi.mock("@vueda/components/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/components/LinkModelView.vue", () => ({ default: LinkModelViewStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/components/LoadingSpinnerInline.vue", () => ({ default: FeedbackSpinnerStub }));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

let ViewCreate, vue, modelConfig;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    modelConfig = vue.reactive({
        loading: vue.ref(false),
        error: vue.ref(null),
        info: { pk: "id" },
        config: { verboseName: "Thing", actionDetails: {}, formProps: {} },
    });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    mockedUseModelInitialValues.mockReturnValue(vue.reactive({}));
    mockedUseForm.mockReturnValue({ state: vue.reactive({ values: {}, anyModified: false }) });
    mockedUseObject.mockReturnValue({ state: vue.reactive({ error: null }) });
    mockedUseObjectForm.mockReturnValue({ state: vue.reactive({ loading: false, error: null }), submit: vi.fn() });
    mockedUseFilteredActions.mockReturnValue(vue.reactive({ actions: [] }));
    ViewCreate = (await import("@vueda/views/ViewCreate.vue")).default;
    provideStore.clear();
});

afterEach(() => {
    vi.clearAllMocks();
});

scopedIt("calls useLookupContext if lookup context is missing", () => {
    mockedInject.mockReturnValueOnce(null);
    mount(ViewCreate, { props: { app: "app", model: "model" } });
    expect(mockedUseLookupContext).toHaveBeenCalled();
});

scopedIt("does not call useLookupContext when lookup context exists", () => {
    mockedInject.mockReturnValueOnce({});
    mount(ViewCreate, { props: { app: "app", model: "model" } });
    expect(mockedUseLookupContext).not.toHaveBeenCalled();
});

scopedIt("emits form events and renders non-detail actions", async () => {
    mockedInject.mockReturnValueOnce({});
    mockedUseFilteredActions.mockReturnValueOnce(vue.reactive({ actions: ["create", "update", "list", "read"] }));
    modelConfig.config.actionDetails = {
        create: {},
        update: {},
        list: {},
        read: { detail: true },
    };
    const wrapper = mount(ViewCreate, {
        props: { app: "myapp", model: "mymodel" },
        slots: { default: "<span>form content</span>" },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("form-object")).toBeTruthy();
    expect(wrapper.emitted("form-context")).toBeTruthy();
    const formArg = mockedUseForm.mock.calls[0][0];
    expect(vue.isReactive(formArg)).toBe(true);

    const links = wrapper.findAll('[data-qa="link-model-view"]');
    const views = links.map((l) => l.attributes("data-view"));
    expect(views).toEqual(["update", "list"]);
});
