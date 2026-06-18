import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { defineComponent, h, reactive, ref } from "vue";

const assignReactiveObject = vi.fn();
const mockedUseObject = vi.fn();
vi.mock("@arrai-innovations/reactive-helpers", () => ({
    assignReactiveObject,
    loadingCombine: (a, b) => a || b,
    useObject: mockedUseObject,
}));

const ErrorDisplayStub = defineComponent({
    name: "ErrorDisplayStub",
    setup(_, { attrs }) {
        return () => h("div", { "data-qa": "error-display", ...attrs });
    },
});
const FormModelStub = defineComponent({
    name: "FormModelStub",
    props: ["app", "model", "view"],
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
const LinkModelViewStub = defineComponent({
    name: "LinkModelViewStub",
    props: ["app", "model", "view", "pk", "label", "button"],
    setup(props) {
        return () =>
            h("div", {
                "data-qa": "link-model-view",
                "data-app": props.app,
                "data-model": props.model,
                "data-view": props.view,
                "data-pk": props.pk,
                "data-label": props.label,
                "data-button": String(props.button || false),
            });
    },
});
const PageActionsStub = defineComponent({
    name: "PageActionsStub",
    setup(_, { slots }) {
        return () => h("div", { "data-qa": "page-actions" }, slots.default ? slots.default() : null);
    },
});
const StickyBarStub = defineComponent({
    name: "StickyBarStub",
    setup(_, { slots }) {
        return () =>
            h("div", { "data-qa": "sticky-bar" }, [
                slots.default ? slots.default() : null,
                slots.primary ? slots.primary() : null,
                slots.secondary ? slots.secondary() : null,
            ]);
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
                    "data-qa": "prime-button",
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

vi.mock("@vueda/components/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/components/FormModel.vue", () => ({ default: FormModelStub }));
vi.mock("@vueda/components/LinkModelView.vue", () => ({ default: LinkModelViewStub }));
vi.mock("@vueda/components/PageActions.vue", () => ({ default: PageActionsStub }));
vi.mock("@vueda/components/StickyBar.vue", () => ({ default: StickyBarStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/components/LoadingSpinnerInline.vue", () => ({ default: FeedbackSpinnerStub }));

const filteredActions = reactive({ actions: [] });
vi.mock("@vueda/use/useFilteredActions.js", () => ({ useFilteredActions: () => filteredActions }));

const isActive = ref(true);
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: () => isActive }));

const modelConfig = reactive({
    loading: false,
    error: null,
    info: { pk: "id" },
    config: { verboseName: "Thing", fetchFields: [], actionDetails: {}, formProps: {} },
});
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => modelConfig }));

vi.mock("@vueda/use/useObject404.js", () => ({ useObject404: vi.fn() }));

const objectTransitions = reactive({ transitions: [] });
vi.mock("@vueda/use/useObjectsWorkflowTransitions.js", () => ({
    useObjectsWorkflowTransitions: () => objectTransitions,
}));

vi.mock("@vueda/utils/case.js", () => ({ memoizedStartCase: (s) => s.toUpperCase() }));

describe("lib/components/DetailView.vue", () => {
    let DetailView, vue, instanceState;

    beforeEach(async () => {
        vue = await vi.importActual("vue");
        instanceState = vue.reactive({ loading: false, object: {}, relatedObjects: {}, calculatedObjects: {} });
        mockedUseObject.mockReturnValue({ state: instanceState });
        assignReactiveObject.mockClear();
        filteredActions.actions = [];
        objectTransitions.transitions = [];
        DetailView = (await import("@vueda/components/DetailView.vue")).default;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    function mountWithContext(options = {}) {
        const formContext = { state: vue.reactive({ values: {}, anyModified: false }) };
        const objectForm = { state: vue.reactive({ loading: false }), submit: vi.fn() };
        return mount(DetailView, {
            props: {
                modelValue: {},
                app: "app",
                model: "model",
                viewName: "read",
                pk: "1",
                objectForm,
                ...options.props,
            },
            attrs: options.attrs,
            slots: options.slots,
            global: { provide: { [FormContextSymbol]: formContext } },
        });
    }

    scopedIt("emits events on mount and populates form when loading complete", async () => {
        instanceState.object = { id: 5, available_actions: [] };
        instanceState.loading = false;
        const wrapper = mountWithContext();
        await vue.nextTick();
        expect(wrapper.emitted("object")).toBeTruthy();
        expect(wrapper.emitted("loading")).toBeTruthy();
        expect(wrapper.emitted("form-context")).toBeTruthy();
        expect(assignReactiveObject).toHaveBeenCalledTimes(1);
    });

    scopedIt("renders actions and transitions", async () => {
        filteredActions.actions = ["activate", "update", "destroy", "read"];
        modelConfig.config.actionDetails = {
            activate: { detail: true },
            update: { detail: false },
            destroy: { detail: false },
            read: { detail: true },
        };
        instanceState.object = { available_actions: ["activate", "update", "destroy", "read"] };
        objectTransitions.transitions = [
            { name: "complete", code: "complete" },
            { name: "approve", code: "approve" },
        ];
        const wrapper = mountWithContext();
        await vue.nextTick();
        const views = wrapper.findAll('[data-qa="link-model-view"]').map((n) => n.attributes("data-view"));
        expect(views.sort()).toEqual(["activate", "approve", "complete", "destroy", "read", "update"].sort());
    });

    scopedIt("sets form id and forwards attrs", () => {
        const wrapper = mountWithContext({ attrs: { foo: "bar" } });
        const form = wrapper.get("form");
        expect(form.attributes("id")).toBe("app-model-1-read");
        expect(form.attributes("foo")).toBe("bar");
    });

    scopedIt("applies the body gutter and merges a themeOverride body class", () => {
        const wrapper = mountWithContext({
            props: { themeOverride: { DetailView: { body: { class: "my-body-class" } } } },
        });
        const body = wrapper.find('[data-qa="read-form"]');
        expect(body.classes()).toEqual(expect.arrayContaining(["px-5", "py-5", "my-body-class"]));
    });
});
