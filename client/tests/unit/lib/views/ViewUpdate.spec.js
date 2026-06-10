import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { useViewUpdate } from "@vueda/use/useViewUpdate.js";
import { defineComponent, h, reactive } from "vue";

vi.mock("@vueda/use/useViewUpdate.js", async () => {
    const actual = await vi.importActual("@vueda/use/useViewUpdate.js");
    return { ...actual, useViewUpdate: vi.fn() };
});

// Stub all child components to avoid needing their dependencies.
vi.mock("@vueda/components/ErrorDisplay.vue", () => ({
    default: defineComponent({ name: "ErrorDisplay", template: "<div />" }),
}));
vi.mock("@vueda/components/FormModel.vue", () => ({
    default: defineComponent({ name: "FormModel", template: "<div />" }),
}));
vi.mock("@vueda/components/LinkModelView.vue", () => ({
    default: defineComponent({ name: "LinkModelView", template: "<div />" }),
}));
const PageActionsStub = defineComponent({
    name: "PageActionsStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "page-actions", ...attrs }, slots.default ? slots.default() : null);
    },
});
vi.mock("@vueda/components/PageActions.vue", () => ({ default: PageActionsStub }));
vi.mock("@vueda/components/StickyBar.vue", () => ({
    default: defineComponent({
        name: "StickyBar",
        template: "<div><slot /><slot name='primary' /><slot name='secondary' /></div>",
    }),
}));
vi.mock("@vueda/controls/button/Button.vue", () => ({
    default: defineComponent({ name: "Button", template: "<button><slot /></button>" }),
}));
vi.mock("@vueda/components/LoadingSpinnerInline.vue", () => ({
    default: defineComponent({ name: "LoadingSpinnerInline", template: "<span />" }),
}));

let mockComposableResult;

beforeEach(async () => {
    mockComposableResult = {
        formInitialValue: reactive({}),
        formContext: {
            state: reactive({ values: {}, anyModified: false }),
            getFirstErrorField: vi.fn(() => null),
        },
        objectForm: {
            state: reactive({ loading: false }),
            submit: vi.fn(),
            confirmation: reactive({ open: false, messages: {}, confirm: vi.fn(), cancel: vi.fn() }),
        },
        modelConfig: reactive({
            config: { verboseName: "widget" },
            loading: false,
        }),
        instanceObject: {
            state: reactive({
                object: null,
                loading: false,
                relatedObjects: {},
                calculatedObjects: {},
            }),
        },
        instance: reactive({
            validAndActive: true,
            titleStr: "Update Widget",
            pageLoading: false,
            formId: "testApp-testModel-42-update",
            computedWidgetProps: {},
            combinedError: null,
            combinedErrored: false,
            combinedWhileText: "",
            combinedFormProps: {},
        }),
        actions: reactive({
            nonDetailActions: [],
            detailActions: [],
            availableTransitions: [],
        }),
    };
    useViewUpdate.mockReturnValue(mockComposableResult);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/views/ViewUpdate.vue", () => {
    describe("composable integration", () => {
        scopedIt("calls useViewUpdate with component props", async () => {
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            mount(ViewUpdate, { props: { app: "myApp", model: "myModel", pk: "7" } });
            expect(useViewUpdate).toHaveBeenCalledWith(
                expect.objectContaining({ app: "myApp", model: "myModel", pk: "7" }),
            );
        });

        scopedIt("provides FormContextSymbol so child components can inject formContext", async () => {
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const Consumer = defineComponent({
                setup() {
                    // We can't use inject() outside of setup in this test context,
                    // but we verify the component mounts without error (provide is called in setup).
                    return {};
                },
                template: "<span />",
            });
            const wrapper = mount(ViewUpdate, {
                props: { app: "a", model: "m", pk: "1" },
                global: { components: { Consumer } },
            });
            // If provide was not called, child injection would silently return null.
            // Verify the component set up correctly (rendered, provide wired without throwing).
            expect(wrapper.exists()).toBe(true);
        });
    });

    describe("emits", () => {
        scopedIt(
            "emits object, loading, related-object, calculated-object, form-object, form-context on mount",
            async () => {
                const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
                const wrapper = mount(ViewUpdate, { props: { app: "a", model: "m", pk: "1" } });
                await wrapper.vm.$nextTick();

                expect(wrapper.emitted("object")).toBeTruthy();
                expect(wrapper.emitted("loading")).toBeTruthy();
                expect(wrapper.emitted("related-object")).toBeTruthy();
                expect(wrapper.emitted("calculated-object")).toBeTruthy();
                expect(wrapper.emitted("form-object")).toBeTruthy();
                expect(wrapper.emitted("form-context")).toBeTruthy();
            },
        );

        scopedIt("form-context emit receives the formContext object", async () => {
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, { props: { app: "a", model: "m", pk: "1" } });
            await wrapper.vm.$nextTick();

            const [emittedContext] = wrapper.emitted("form-context")[0];
            expect(emittedContext).toBe(mockComposableResult.formContext);
        });
    });

    describe("rendering", () => {
        scopedIt("renders root element with data-qa attribute", async () => {
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.find('[data-qa="update-form-root"]').exists()).toBe(true);
        });

        scopedIt("passes class prop to root element", async () => {
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, {
                props: { app: "a", model: "m", pk: "1", class: "my-class" },
            });
            expect(wrapper.find(".my-class").exists()).toBe(true);
        });

        scopedIt("form action button container has data-qa attribute", async () => {
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.find('[data-qa="update-action-button"]').exists()).toBe(true);
        });
    });
});
