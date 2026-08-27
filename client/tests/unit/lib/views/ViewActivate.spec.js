import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseList = vi.fn();
const mockedUseIsActive = vi.fn();
const mockedUseLookupContext = vi.fn();
const mockedUseModelConfig = vi.fn();

vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return {
        ...actual,
        useList: mockedUseList,
    };
});
vi.mock("@vueda/use/useIsActive.js", async () => {
    const actual = await vi.importActual("@vueda/use/useIsActive.js");
    return {
        ...actual,
        useIsActive: mockedUseIsActive,
    };
});
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: mockedUseModelConfig,
}));

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({
    slotResolver: (key) => (key === "root" ? "theme-root" : ""),
});
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
    props: ["app", "model", "action", "runAction", "fetchState", "requestMethod", "tone", "pk"],
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
vi.mock("@vueda/views/ModelActionForm.vue", () => ({
    default: ModelActionFormStub,
}));

const LoadingSpinnerBlockStub = defineComponent({
    name: "LoadingSpinnerBlockStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "loading-spinner-block", ...attrs });
    },
});
vi.mock("@vueda/display/loading/LoadingSpinnerBlock.vue", () => ({ default: LoadingSpinnerBlockStub }));

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

const PageActionsStub = defineComponent({
    name: "PageActionsStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "page-actions", ...attrs }, slots.default ? slots.default() : null);
    },
});
vi.mock("@vueda/shell/page-title/PageActions.vue", () => ({
    default: PageActionsStub,
}));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

let ViewActivate, vue, mockInstanceList, modelConfig;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    modelConfig = vue.reactive({ info: { pk: "id" }, loading: false });
    mockedUseModelConfig.mockReturnValue(modelConfig);
    mockedUseIsActive.mockReturnValue(vue.ref(true));
    mockInstanceList = {
        state: vue.reactive({ objects: [], errored: false, error: null }),
    };
    mockedUseList.mockReturnValue(mockInstanceList);
    ViewActivate = (await import("@vueda/views/ViewActivate.vue")).default;
    provideStore.clear();
    mockedInject.mockReset();
    mockedUseTheme.mockClear();
    routerBack.mockClear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/views/ViewActivate.vue", () => {
    describe("Lookup context", () => {
        scopedIt("calls useLookupContext if lookup context is missing", () => {
            mockedInject.mockReturnValueOnce(null);
            mount(ViewActivate, { props: { app: "a", model: "b", pk: "1" } });
            expect(mockedUseLookupContext).toHaveBeenCalled();
        });

        scopedIt("does not call useLookupContext when lookup context exists", () => {
            mockedInject.mockReturnValueOnce({});
            mount(ViewActivate, { props: { app: "a", model: "b", pk: "1" } });
            expect(mockedUseLookupContext).not.toHaveBeenCalled();
        });
    });

    describe("Loading state", () => {
        scopedIt("renders spinner when model config info is empty", () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.info = {};
            const wrapper = mount(ViewActivate, { props: { app: "app", model: "model", pk: "1" } });
            expect(wrapper.find('[data-qa="loading-spinner-block"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="model-action-form"]').exists()).toBe(false);
        });

        scopedIt("renders page actions even while spinner is showing", () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.info = {};
            const wrapper = mount(ViewActivate, { props: { app: "app", model: "model", pk: "1" } });
            expect(wrapper.find('[data-qa="page-actions"]').exists()).toBe(true);
        });
    });

    describe("Rendering", () => {
        scopedIt("passes props to ActionForm when loaded", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActivate, { props: { app: "myApp", model: "myModel", pk: "id123" } });
            const af = wrapper.find('[data-qa="model-action-form"]');
            expect(af.exists()).toBe(true);
            expect(af.attributes("data-app")).toBe("myApp");
            expect(af.attributes("data-model")).toBe("myModel");
            expect(af.attributes("data-action")).toBe("activate");
        });

        scopedIt("applies theme root and registers the theme entry", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActivate, {
                props: { app: "app", model: "person", pk: "1", class: "custom" },
            });
            const root = wrapper.find('[data-qa="view-activate-root"]');
            expect(root.classes()).toContain("theme-root");
            expect(root.classes()).toContain("custom");
            expect(mockedUseTheme).toHaveBeenCalledWith("ViewActivate", expect.any(Object));
        });
    });

    describe("Navigation", () => {
        scopedIt("forwards return-button slot and falls back to Go Back button that calls router.back", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActivate, {
                props: { app: "app", model: "model", pk: "1" },
            });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            expect(routerBack).toHaveBeenCalled();
        });

        scopedIt("custom return-button slot replaces fallback Go Back button", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActivate, {
                props: { app: "app", model: "model", pk: "1" },
                slots: {
                    "return-button": "<button data-qa='custom-return'>back</button>",
                },
            });
            expect(wrapper.find('[data-qa="custom-return"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="prime-button"]').exists()).toBe(false);
        });
    });

    describe("Action execution", () => {
        scopedIt("delegates activate submission to ModelActionForm's shared runner", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewActivate, { props: { app: "app", model: "model", pk: "1" } });
            const form = wrapper.findComponent(ModelActionFormStub);

            expect(form.props("runAction")).toBeUndefined();
            expect(form.props("requestMethod")).toBe("PATCH");
            expect(form.props("tone")).toBe("success");
            expect(form.props("pk")).toBe("1");
        });

        scopedIt("passes scalar and array primary keys to the preview list params", () => {
            mockedInject.mockReturnValueOnce({});
            mount(ViewActivate, { props: { app: "app", model: "model", pk: "1" } });
            expect(mockedUseList.mock.calls.at(-1)[0].props.params.id).toEqual(["1"]);

            mockedInject.mockReturnValueOnce({});
            mount(ViewActivate, { props: { app: "app", model: "model", pk: ["1", "2"] } });
            expect(mockedUseList.mock.calls.at(-1)[0].props.params.id).toEqual(["1", "2"]);
        });
    });
});
