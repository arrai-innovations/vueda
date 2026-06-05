import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { useDetailView } from "@vueda/use/useDetailView.js";
import { useForm } from "@vueda/use/useForm.js";
import { defineComponent, h, reactive } from "vue";

vi.mock("@vueda/use/useDetailView.js", async () => {
    const actual = await vi.importActual("@vueda/use/useDetailView.js");
    return { ...actual, useDetailView: vi.fn() };
});
vi.mock("@vueda/use/useForm.js", async () => {
    const actual = await vi.importActual("@vueda/use/useForm.js");
    return { ...actual, useForm: vi.fn() };
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

let mockFormContext;
let mockDetailViewResult;

beforeEach(async () => {
    mockFormContext = {
        state: reactive({ values: {}, anyModified: false }),
        getFirstErrorField: vi.fn(() => null),
    };
    mockDetailViewResult = {
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
            titleStr: "Read Widget",
            pageLoading: false,
            formId: "testApp-testModel-42-read",
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
    useDetailView.mockReturnValue(mockDetailViewResult);
    useForm.mockReturnValue(mockFormContext);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/views/ViewRead.vue", () => {
    describe("composable integration", () => {
        scopedIt("calls useDetailView with viewName 'read'", async () => {
            const { default: ViewRead } = await import("@vueda/views/ViewRead.vue");
            mount(ViewRead, { props: { app: "myApp", model: "myModel", pk: "7" } });
            const [internalOptions] = useDetailView.mock.calls[0];
            expect(internalOptions.viewName).toBe("read");
        });

        scopedIt("passes app, model, and pk to useDetailView", async () => {
            const { default: ViewRead } = await import("@vueda/views/ViewRead.vue");
            mount(ViewRead, { props: { app: "myApp", model: "myModel", pk: "7" } });
            const [internalOptions] = useDetailView.mock.calls[0];
            expect(internalOptions.app).toBe("myApp");
            expect(internalOptions.model).toBe("myModel");
            expect(internalOptions.pk).toBe("7");
        });

        scopedIt("passes formContextProps.initialValues as formInitialValue to useDetailView", async () => {
            const { default: ViewRead } = await import("@vueda/views/ViewRead.vue");
            mount(ViewRead, { props: { app: "a", model: "m", pk: "1" } });
            const [, formInitialValue] = useDetailView.mock.calls[0];
            expect(formInitialValue).toBeDefined();
        });
    });

    describe("emits", () => {
        scopedIt(
            "emits object, loading, related-object, calculated-object, form-object, form-context on mount",
            async () => {
                const { default: ViewRead } = await import("@vueda/views/ViewRead.vue");
                const wrapper = mount(ViewRead, { props: { app: "a", model: "m", pk: "1" } });
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
            const { default: ViewRead } = await import("@vueda/views/ViewRead.vue");
            const wrapper = mount(ViewRead, { props: { app: "a", model: "m", pk: "1" } });
            await wrapper.vm.$nextTick();

            const [emittedContext] = wrapper.emitted("form-context")[0];
            expect(emittedContext).toBe(mockFormContext);
        });
    });

    describe("rendering", () => {
        scopedIt("renders root element with data-qa attribute", async () => {
            const { default: ViewRead } = await import("@vueda/views/ViewRead.vue");
            const wrapper = mount(ViewRead, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.find('[data-qa="read-form-root"]').exists()).toBe(true);
        });

        scopedIt("action button container has data-qa attribute", async () => {
            const { default: ViewRead } = await import("@vueda/views/ViewRead.vue");
            const wrapper = mount(ViewRead, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.find('[data-qa="read-action-button"]').exists()).toBe(true);
        });

        scopedIt("attrs are forwarded to the inner content div", async () => {
            const { default: ViewRead } = await import("@vueda/views/ViewRead.vue");
            const wrapper = mount(ViewRead, {
                props: { app: "a", model: "m", pk: "1" },
                attrs: { "data-test": "custom-value" },
            });
            expect(wrapper.find('[data-qa="read-form"]').attributes("data-test")).toBe("custom-value");
        });
    });
});
