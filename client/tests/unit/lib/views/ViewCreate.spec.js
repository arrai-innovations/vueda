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

vi.mock("@arrai-innovations/reactive-helpers", async (importActual) => ({
    ...(await importActual()),
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

const PageActionsStub = defineComponent({
    name: "PageActionsStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "page-actions", ...attrs }, slots.default ? slots.default() : null);
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
// Mirrors the real dialog's `warnings` scoped slot (`{ warnings }`) so ViewCreate's default
// FieldWarningsList rendering and its `form-confirm-dialog-warnings`/`warning-entry` overrides can
// be exercised the same way they work against the real FormConfirmDialog.
const FormConfirmDialogStub = defineComponent({
    name: "FormConfirmDialogStub",
    props: ["controller", "title", "description", "confirmLabel"],
    setup(props, { slots }) {
        return () =>
            h("div", { "data-qa": "form-confirm-dialog" }, [
                slots.warnings ? slots.warnings({ warnings: props.controller.messages }) : null,
            ]);
    },
});

vi.mock("@vueda/shell/page-title/PageActions.vue", () => ({ default: PageActionsStub }));
vi.mock("@vueda/shell/sticky/StickyBar.vue", () => ({ default: StickyBarStub }));
vi.mock("@vueda/form/form-model/FormModel.vue", () => ({ default: FormModelStub }));
vi.mock("@vueda/display/error-display/ErrorDisplay.vue", () => ({ default: ErrorDisplayStub }));
vi.mock("@vueda/navigation/link-model-view/LinkModelView.vue", () => ({ default: LinkModelViewStub }));
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));
vi.mock("@vueda/display/loading/LoadingSpinnerInline.vue", () => ({ default: FeedbackSpinnerStub }));
vi.mock("@vueda/form/confirm/FormConfirmDialog.vue", () => ({ default: FormConfirmDialogStub }));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

let ViewCreate, vue, modelConfig, objectForm;

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
    objectForm = {
        state: vue.reactive({ loading: false, error: null }),
        submit: vi.fn(),
        confirmation: vue.reactive({ open: false, messages: {}, confirm: vi.fn(), cancel: vi.fn() }),
    };
    mockedUseObjectForm.mockReturnValue(objectForm);
    mockedUseFilteredActions.mockReturnValue(vue.reactive({ actions: [] }));
    ViewCreate = (await import("@vueda/views/ViewCreate.vue")).default;
    provideStore.clear();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe("lib/views/ViewCreate.vue", () => {
    describe("Lookup context", () => {
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
    });

    describe("Form integration", () => {
        scopedIt("emits form events and renders non-detail actions", async () => {
            mockedInject.mockReturnValueOnce({});
            mockedUseFilteredActions.mockReturnValueOnce(
                vue.reactive({ actions: ["create", "update", "list", "read"] }),
            );
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

        scopedIt("renders FormConfirmDialog bound to the objectForm confirmation controller", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewCreate, { props: { app: "app", model: "model" } });
            const dialog = wrapper.findComponent(FormConfirmDialogStub);
            expect(dialog.exists()).toBe(true);
            expect(dialog.props("controller")).toBe(objectForm.confirmation);
            expect(dialog.props("title")).toBe("Confirm save");
            expect(dialog.props("description")).toBe("This change has warnings. Review them before saving.");
            expect(dialog.props("confirmLabel")).toBe("Save anyway");
        });
    });

    describe("Rendering", () => {
        scopedIt("applies the default theme gutter to the form body", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewCreate, { props: { app: "app", model: "model" } });
            const body = wrapper.find('[data-qa="create-form"]');
            expect(body.classes()).toEqual(expect.arrayContaining(["px-5", "py-5"]));
        });
    });

    describe("Warning confirmation dialog", () => {
        scopedIt("renders FieldWarningsList with the confirmation controller's warnings by default", () => {
            mockedInject.mockReturnValueOnce({});
            objectForm.confirmation.messages = { count: ["A negative count is unusual."] };
            const wrapper = mount(ViewCreate, { props: { app: "app", model: "model" } });
            expect(wrapper.get('[data-qa="field-warnings-list"]').text()).toContain("A negative count is unusual.");
        });

        scopedIt("forwards the warning-entry slot to FieldWarningsList's entry slot", () => {
            mockedInject.mockReturnValueOnce({});
            objectForm.confirmation.messages = { count: ["A negative count is unusual."] };
            const wrapper = mount(ViewCreate, {
                props: { app: "app", model: "model" },
                slots: {
                    "warning-entry": `<template #warning-entry="{ field, messages }">
                        <div data-qa="custom-warning-entry" :data-field="field">{{ messages.join(", ") }}</div>
                    </template>`,
                },
            });
            const entry = wrapper.get('[data-qa="custom-warning-entry"]');
            expect(entry.attributes("data-field")).toBe("count");
            expect(entry.text()).toBe("A negative count is unusual.");
        });

        scopedIt("form-confirm-dialog-warnings slot overrides the default FieldWarningsList rendering", () => {
            mockedInject.mockReturnValueOnce({});
            objectForm.confirmation.messages = { count: ["unusual"] };
            const wrapper = mount(ViewCreate, {
                props: { app: "app", model: "model" },
                slots: {
                    "form-confirm-dialog-warnings": `<template #form-confirm-dialog-warnings="{ warnings }">
                        <div data-qa="custom-warnings">{{ JSON.stringify(warnings) }}</div>
                    </template>`,
                },
            });
            expect(wrapper.find('[data-qa="field-warnings-list"]').exists()).toBe(false);
            expect(JSON.parse(wrapper.get('[data-qa="custom-warnings"]').text())).toEqual({ count: ["unusual"] });
        });
    });
});
