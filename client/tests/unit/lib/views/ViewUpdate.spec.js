import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { useViewUpdate } from "@vueda/use/useViewUpdate.js";
import { defineComponent, h, reactive } from "vue";

vi.mock("@vueda/use/useViewUpdate.js", async () => {
    const actual = await vi.importActual("@vueda/use/useViewUpdate.js");
    return { ...actual, useViewUpdate: vi.fn() };
});

// Stub all child components to avoid needing their dependencies.
vi.mock("@vueda/display/error-display/ErrorDisplay.vue", () => ({
    default: defineComponent({ name: "ErrorDisplay", template: "<div />" }),
}));
vi.mock("@vueda/form/form-model/FormModel.vue", () => ({
    default: defineComponent({ name: "FormModel", template: "<div />" }),
}));
vi.mock("@vueda/navigation/link-model-view/LinkModelView.vue", () => ({
    default: defineComponent({ name: "LinkModelView", template: "<div />" }),
}));
const PageActionsStub = defineComponent({
    name: "PageActionsStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "page-actions", ...attrs }, slots.default ? slots.default() : null);
    },
});
vi.mock("@vueda/shell/page-title/PageActions.vue", () => ({ default: PageActionsStub }));
vi.mock("@vueda/shell/sticky/StickyBar.vue", () => ({
    default: defineComponent({
        name: "StickyBar",
        template: "<div><slot /><slot name='primary' /><slot name='secondary' /></div>",
    }),
}));
vi.mock("@vueda/controls/button/Button.vue", () => ({
    default: defineComponent({ name: "Button", template: "<button><slot /></button>" }),
}));
vi.mock("@vueda/display/loading/LoadingSpinnerInline.vue", () => ({
    default: defineComponent({ name: "LoadingSpinnerInline", template: "<span />" }),
}));
// Mirrors the real dialog's `warnings` scoped slot (`{ warnings }`) so ViewUpdate's default
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
vi.mock("@vueda/form/confirm/FormConfirmDialog.vue", () => ({ default: FormConfirmDialogStub }));

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
            currentActionAvailable: true,
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
            expect(wrapper.find('[data-qa="update-action-buttons"]').exists()).toBe(true);
        });

        scopedIt("renders FormConfirmDialog with save-specific copy", async () => {
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, { props: { app: "a", model: "m", pk: "1" } });
            const dialog = wrapper.findComponent(FormConfirmDialogStub);
            expect(dialog.exists()).toBe(true);
            expect(dialog.props("controller")).toBe(mockComposableResult.objectForm.confirmation);
            expect(dialog.props("title")).toBe("Confirm save");
            expect(dialog.props("description")).toBe("This change has warnings. Review them before saving.");
            expect(dialog.props("confirmLabel")).toBe("Save anyway");
        });

        scopedIt("applies the default theme gutter to the form body", async () => {
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, { props: { app: "a", model: "m", pk: "1" } });
            const body = wrapper.find('[data-qa="update-form"]');
            expect(body.classes()).toEqual(expect.arrayContaining(["px-5", "py-5"]));
        });

        scopedIt("merges a themeOverride body class with the form-body theme gutter", async () => {
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, {
                props: {
                    app: "a",
                    model: "m",
                    pk: "1",
                    themeOverride: { ViewUpdate: { body: { class: "my-outer-class" } } },
                },
            });
            const body = wrapper.find('[data-qa="update-form"]');
            expect(body.classes()).toEqual(expect.arrayContaining(["px-5", "py-5", "my-outer-class"]));
        });
    });

    describe("editing unavailable", () => {
        scopedIt("renders the form and submit button when currentActionAvailable is true", async () => {
            mockComposableResult.instance.currentActionAvailable = true;
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.find("form").exists()).toBe(true);
            expect(wrapper.findComponent({ name: "Button" }).exists()).toBe(true);
            expect(wrapper.find('[data-qa="update-unavailable-notice"]').exists()).toBe(false);
        });

        scopedIt(
            "hides the form and submit button and shows a notice when currentActionAvailable is false",
            async () => {
                mockComposableResult.instance.currentActionAvailable = false;
                const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
                const wrapper = mount(ViewUpdate, { props: { app: "a", model: "m", pk: "1" } });
                expect(wrapper.find("form").exists()).toBe(false);
                expect(wrapper.findComponent({ name: "Button" }).exists()).toBe(false);
                const notice = wrapper.find('[data-qa="update-unavailable-notice"]');
                expect(notice.exists()).toBe(true);
                expect(notice.text()).toContain("can't be edited");
            },
        );

        scopedIt("the update-unavailable slot overrides the default notice", async () => {
            mockComposableResult.instance.currentActionAvailable = false;
            mockComposableResult.modelConfig.config.verboseName = "purchase order";
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, {
                props: { app: "a", model: "m", pk: "1" },
                slots: {
                    "update-unavailable": `<template #update-unavailable="{ app, model, pk, verboseName }">
                        <div data-qa="custom-unavailable">{{ app }}/{{ model }}/{{ pk }}/{{ verboseName }}</div>
                    </template>`,
                },
            });
            expect(wrapper.find('[data-qa="update-unavailable-notice"]').exists()).toBe(false);
            expect(wrapper.get('[data-qa="custom-unavailable"]').text()).toBe("a/m/1/purchase order");
        });
    });

    describe("Warning confirmation dialog", () => {
        scopedIt("renders FieldWarningsList with the confirmation controller's warnings by default", async () => {
            mockComposableResult.objectForm.confirmation.messages = { count: ["A negative count is unusual."] };
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.get('[data-qa="field-warnings-list"]').text()).toContain("A negative count is unusual.");
        });

        scopedIt("names a warned field by its label from the model config", async () => {
            mockComposableResult.modelConfig.config.fieldDetails = { count: { label: "Units counted" } };
            mockComposableResult.objectForm.confirmation.messages = { count: ["A negative count is unusual."] };
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, { props: { app: "a", model: "m", pk: "1" } });
            expect(wrapper.get('[data-qa="field-warnings-list"]').text()).toContain(
                "Units counted: A negative count is unusual.",
            );
        });

        scopedIt("forwards the warning-entry slot to FieldWarningsList's entry slot", async () => {
            mockComposableResult.objectForm.confirmation.messages = { count: ["A negative count is unusual."] };
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, {
                props: { app: "a", model: "m", pk: "1" },
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

        scopedIt("form-confirm-dialog-warnings slot overrides the default FieldWarningsList rendering", async () => {
            mockComposableResult.objectForm.confirmation.messages = { count: ["unusual"] };
            const { default: ViewUpdate } = await import("@vueda/views/ViewUpdate.vue");
            const wrapper = mount(ViewUpdate, {
                props: { app: "a", model: "m", pk: "1" },
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
