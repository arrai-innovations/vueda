import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { ConfirmationRequiredError } from "@vueda/utils/errors.js";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseLookupContext = vi.fn();
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));

const mockedUseModelConfig = vi.fn();
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: mockedUseModelConfig,
}));

const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
};
vi.mock("vue-sonner", () => ({ toast: toastMock }));

const routerBack = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ back: routerBack }),
}));

const ButtonStub = defineComponent({
    name: "ButtonStub",
    props: ["disabled", "type"],
    setup(props, { attrs, slots }) {
        return () =>
            h("button", { "data-qa": "button", "data-disabled": String(props.disabled), ...attrs }, slots.default?.());
    },
});
vi.mock("@vueda/controls/button/Button.vue", () => ({ default: ButtonStub }));

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
vi.mock("@vueda/navigation/link-model-view/LinkModelView.vue", () => ({ default: LinkModelViewStub }));

const PageActionsStub = defineComponent({
    name: "PageActionsStub",
    setup(_, { slots, attrs }) {
        return () => h("div", { "data-qa": "page-actions", ...attrs }, slots.default ? slots.default() : null);
    },
});
vi.mock("@vueda/shell/page-title/PageActions.vue", () => ({ default: PageActionsStub }));

const fetchWorkflowTransition = vi.fn();
const fetchObjectTransitions = vi.fn();
const fetchObjectState = vi.fn();
const executeTransition = vi.fn();

const workflowStore = {
    workflowTransitions: { "a.m": [] },
    objectTransitions: { "a.m": {} },
    objectStates: { "a.m": {} },
    loading: false,
    fetchWorkflowTransition,
    fetchObjectTransitions,
    fetchObjectState,
    executeTransition,
};

vi.mock("@vueda/stores/storeWorkflow.js", () => ({
    storeWorkflow: () => workflowStore,
}));

vi.mock("@vueda/utils/case.js", () => ({
    getAppModelDotName: ({ app, model }) => `${app}.${model}`,
    memoizedStartCase: (s) => s,
}));

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    ({ provideStore, mockedProvide, mockedInject } = mockProvideInject(vi));
    return { __esModule: true, ...actual, inject: mockedInject, provide: mockedProvide };
});

let ViewWorkflowTransition, vue;

describe("lib/views/ViewWorkflowTransition.vue", () => {
    beforeEach(async () => {
        vue = await vi.importActual("vue");
        mockedUseModelConfig.mockReturnValue(vue.reactive({ info: { verbose_name: "Thing" } }));
        ViewWorkflowTransition = (await import("@vueda/views/ViewWorkflowTransition.vue")).default;
        provideStore.clear();
        fetchWorkflowTransition.mockClear();
        fetchObjectTransitions.mockClear();
        fetchObjectState.mockClear();
        executeTransition.mockClear();
        workflowStore.objectStates = { "a.m": {} };
        workflowStore.objectTransitions = { "a.m": {} };
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        routerBack.mockClear();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    scopedIt("calls useLookupContext if lookup context is missing", () => {
        mockedInject.mockReturnValueOnce(null);
        mount(ViewWorkflowTransition, { props: { app: "a", model: "b", pk: "1" } });
        expect(mockedUseLookupContext).toHaveBeenCalled();
    });

    scopedIt("fetches transitions for each pk in array and computes intersection", async () => {
        mockedInject.mockReturnValueOnce({});
        workflowStore.objectTransitions = {
            "a.m": {
                1: {
                    transitions: [
                        { code: "a", name: "A" },
                        { code: "b", name: "B" },
                    ],
                },
                2: {
                    transitions: [
                        { code: "a", name: "A" },
                        { code: "c", name: "C" },
                    ],
                },
            },
        };
        const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: ["1", "2"] } });
        await vue.nextTick();
        expect(fetchObjectTransitions).toHaveBeenCalledWith("a", "m", "1");
        expect(fetchObjectTransitions).toHaveBeenCalledWith("a", "m", "2");
        expect(wrapper.vm.availableTransitions).toEqual([{ code: "a", name: "A" }]);
    });

    scopedIt("submits transition and shows success toast", async () => {
        mockedInject.mockReturnValueOnce({});
        const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
        wrapper.vm.selectedAction = "a";
        await wrapper.vm.handleSubmit();
        expect(executeTransition).toHaveBeenCalledWith("a", "m", "1", "a", expect.any(Object));
        expect(toastMock.success).toHaveBeenCalledWith("transition succeeded");
        expect(routerBack).toHaveBeenCalled();
    });

    scopedIt("renders the terminal-state empty branch with state-named title and back CTA", async () => {
        mockedInject.mockReturnValueOnce({});
        workflowStore.objectStates = {
            "a.m": {
                1: { state: { code: "paid", name: "Paid" } },
            },
        };
        workflowStore.objectTransitions = { "a.m": { 1: { transitions: [] } } };
        const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
        await vue.nextTick();
        const empty = wrapper.find('[data-qa="view-workflow-transition-empty"]');
        expect(empty.exists()).toBe(true);
        expect(empty.text()).toContain("No transitions available from Paid.");
        expect(fetchObjectState).toHaveBeenCalledWith("a", "m", "1");
        const backButton = empty.findAll('[data-qa="button"]').at(-1);
        await backButton.trigger("click");
        expect(routerBack).toHaveBeenCalled();
    });

    scopedIt("falls back to a generic empty title when state name is unavailable", async () => {
        mockedInject.mockReturnValueOnce({});
        workflowStore.objectTransitions = { "a.m": { 1: { transitions: [] } } };
        const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
        await vue.nextTick();
        const empty = wrapper.find('[data-qa="view-workflow-transition-empty"]');
        expect(empty.exists()).toBe(true);
        expect(empty.text()).toContain("No transitions available.");
        expect(empty.text()).not.toContain("from");
    });

    scopedIt("shows error toast when submission fails", async () => {
        mockedInject.mockReturnValueOnce({});
        executeTransition.mockRejectedValueOnce(new Error("fail"));
        const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
        wrapper.vm.selectedAction = "a";
        await wrapper.vm.handleSubmit();
        expect(toastMock.error).toHaveBeenCalledWith("transition failed");
        expect(routerBack).not.toHaveBeenCalled();
    });

    describe("warning confirmation", () => {
        // The alert-dialog primitives teleport and gate on `open`; stub them to passthroughs (as
        // FormConfirmDialog.spec.js does) so these tests can find and click the dialog's buttons
        // directly within the mounted tree.
        const passthrough = { template: "<div><slot /></div>" };
        const buttonStub = { template: "<button @click=\"$emit('click')\"><slot /></button>", emits: ["click"] };
        const alertDialogStubs = {
            AlertDialog: passthrough,
            AlertDialogContent: passthrough,
            AlertDialogHeader: passthrough,
            AlertDialogTitle: passthrough,
            AlertDialogDescription: passthrough,
            AlertDialogFooter: passthrough,
            AlertDialogCancel: buttonStub,
            AlertDialogAction: buttonStub,
        };
        const mountView = (props) => mount(ViewWorkflowTransition, { props, global: { stubs: alertDialogStubs } });

        const confirmationError = (digest, messages) =>
            new ConfirmationRequiredError({ confirmation_required: true, digest, warnings: messages }, { status: 409 });

        scopedIt("shows the confirmation dialog on a 409 and retries with the digest once confirmed", async () => {
            mockedInject.mockReturnValueOnce({});
            executeTransition
                .mockRejectedValueOnce(confirmationError("digest-abc", { non_field_errors: ["Will notify customer."] }))
                .mockResolvedValueOnce({});
            const wrapper = mountView({ app: "a", model: "m", pk: "1" });
            wrapper.vm.selectedAction = "a";

            const submitPromise = wrapper.vm.handleSubmit();
            await vue.nextTick();
            await vue.nextTick();

            const dialog = wrapper.find('[data-qa="form-confirm-dialog"]');
            expect(dialog.exists()).toBe(true);
            expect(wrapper.text()).toContain("Will notify customer.");

            await wrapper.find('[data-qa="form-confirm-action"]').trigger("click");
            await submitPromise;

            expect(executeTransition).toHaveBeenCalledTimes(2);
            expect(executeTransition).toHaveBeenNthCalledWith(1, "a", "m", "1", "a", expect.any(Object));
            expect(executeTransition).toHaveBeenNthCalledWith(
                2,
                "a",
                "m",
                "1",
                "a",
                expect.any(Object),
                undefined,
                false,
                "digest-abc",
            );
            expect(toastMock.success).toHaveBeenCalledWith("transition succeeded");
            expect(routerBack).toHaveBeenCalled();
        });

        scopedIt("cancelling the confirmation dialog leaves the transition unapplied", async () => {
            mockedInject.mockReturnValueOnce({});
            executeTransition.mockRejectedValueOnce(
                confirmationError("digest-abc", { non_field_errors: ["Will notify customer."] }),
            );
            const wrapper = mountView({ app: "a", model: "m", pk: "1" });
            wrapper.vm.selectedAction = "a";

            const submitPromise = wrapper.vm.handleSubmit();
            await vue.nextTick();
            await vue.nextTick();

            await wrapper.find('[data-qa="form-confirm-cancel"]').trigger("click");
            await submitPromise;

            expect(executeTransition).toHaveBeenCalledTimes(1);
            expect(toastMock.success).not.toHaveBeenCalled();
            expect(toastMock.error).not.toHaveBeenCalled();
            expect(routerBack).not.toHaveBeenCalled();
        });

        scopedIt("re-prompts when the acknowledged retry reports a changed warning set", async () => {
            mockedInject.mockReturnValueOnce({});
            executeTransition
                .mockRejectedValueOnce(confirmationError("digest-abc", { non_field_errors: ["First warning."] }))
                .mockRejectedValueOnce(confirmationError("digest-xyz", { non_field_errors: ["Second warning."] }))
                .mockResolvedValueOnce({});
            const wrapper = mountView({ app: "a", model: "m", pk: "1" });
            wrapper.vm.selectedAction = "a";

            const submitPromise = wrapper.vm.handleSubmit();
            await vue.nextTick();
            await vue.nextTick();
            expect(wrapper.text()).toContain("First warning.");

            await wrapper.find('[data-qa="form-confirm-action"]').trigger("click");
            await vue.nextTick();
            await vue.nextTick();
            expect(wrapper.text()).toContain("Second warning.");

            await wrapper.find('[data-qa="form-confirm-action"]').trigger("click");
            await submitPromise;

            expect(executeTransition).toHaveBeenCalledTimes(3);
            expect(toastMock.success).toHaveBeenCalledWith("transition succeeded");
            expect(routerBack).toHaveBeenCalled();
        });
    });

    describe("card list", () => {
        scopedIt("renders a card for each available transition", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": {
                    1: {
                        transitions: [
                            { code: "approve", name: "Approve" },
                            { code: "reject", name: "Reject" },
                        ],
                    },
                },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            const cards = wrapper.findAll("label[for]");
            expect(cards).toHaveLength(2);
            expect(cards[0].text()).toContain("Approve");
            expect(cards[1].text()).toContain("Reject");
        });

        scopedIt("each card contains a hidden radio input with the transition code as value", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": { 1: { transitions: [{ code: "approve", name: "Approve" }] } },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            const radio = wrapper.find('input[type="radio"][value="approve"]');
            expect(radio.exists()).toBe(true);
        });

        scopedIt("selecting a radio updates selectedAction", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": { 1: { transitions: [{ code: "approve", name: "Approve" }] } },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            const radio = wrapper.find('input[type="radio"][value="approve"]');
            radio.element.checked = true;
            await radio.trigger("change");
            expect(wrapper.vm.selectedAction).toBe("approve");
        });

        scopedIt("adds data-selected to the matching card when a transition is selected", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": {
                    1: {
                        transitions: [
                            { code: "approve", name: "Approve" },
                            { code: "reject", name: "Reject" },
                        ],
                    },
                },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            wrapper.vm.selectedAction = "approve";
            await vue.nextTick();
            const cards = wrapper.findAll("label[for]");
            expect(cards[0].attributes("data-selected")).toBe("true");
            expect(cards[1].attributes("data-selected")).toBeUndefined();
        });

        scopedIt("shows transition description when present", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": {
                    1: { transitions: [{ code: "approve", name: "Approve", description: "Move to approved state" }] },
                },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            expect(wrapper.text()).toContain("Move to approved state");
        });
    });

    describe("current state strip", () => {
        scopedIt("shows current state strip with state name for single pk", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectStates = {
                "a.m": { 1: { state: { code: "draft", name: "Draft" } } },
            };
            workflowStore.objectTransitions = {
                "a.m": { 1: { transitions: [{ code: "approve", name: "Approve" }] } },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            expect(wrapper.text()).toContain("Currently");
            expect(wrapper.text()).toContain("Draft");
        });

        scopedIt("hides current state strip when state is not available", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": { 1: { transitions: [{ code: "approve", name: "Approve" }] } },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            expect(wrapper.text()).not.toContain("Currently");
        });

        scopedIt("hides current state strip for bulk pk", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": {
                    1: { transitions: [{ code: "approve", name: "Approve" }] },
                    2: { transitions: [{ code: "approve", name: "Approve" }] },
                },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: ["1", "2"] } });
            await vue.nextTick();
            expect(wrapper.text()).not.toContain("Currently");
        });
    });

    describe("disabled transitions", () => {
        scopedIt("renders disabled card with data-disabled attribute and disabled radio", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": {
                    1: {
                        transitions: [
                            { code: "approve", name: "Approve" },
                            { code: "void", name: "Void", disabled: true, disabled_reason: "Restricted" },
                        ],
                    },
                },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            const cards = wrapper.findAll("label[for]");
            expect(cards[0].attributes("data-disabled")).toBeUndefined();
            expect(cards[1].attributes("data-disabled")).toBe("true");
            expect(cards[1].find("input").element.disabled).toBe(true);
        });

        scopedIt("shows disabled_reason text on a disabled card", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": {
                    1: { transitions: [{ code: "void", name: "Void", disabled: true, disabled_reason: "Restricted" }] },
                },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            expect(wrapper.text()).toContain("Restricted");
        });

        scopedIt("omits reason text when disabled_reason is absent", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": {
                    1: { transitions: [{ code: "void", name: "Void", disabled: true }] },
                },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            const card = wrapper.find("label[for]");
            expect(card.text()).toBe("Void");
        });
    });

    describe("target state pill", () => {
        scopedIt("renders pill with target_state_label when present", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": {
                    1: {
                        transitions: [
                            {
                                code: "approve",
                                name: "Approve",
                                target_state_label: "Approved",
                                target_state_tone: "success",
                            },
                        ],
                    },
                },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            const pill = wrapper.find("[data-tone]");
            expect(pill.exists()).toBe(true);
            expect(pill.text()).toBe("Approved");
            expect(pill.attributes("data-tone")).toBe("success");
        });

        scopedIt("omits pill when target_state_label is absent", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": { 1: { transitions: [{ code: "approve", name: "Approve" }] } },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            expect(wrapper.find("[data-tone]").exists()).toBe(false);
        });

        scopedIt("defaults to neutral tone when target_state_tone is absent", async () => {
            mockedInject.mockReturnValueOnce({});
            workflowStore.objectTransitions = {
                "a.m": {
                    1: { transitions: [{ code: "approve", name: "Approve", target_state_label: "Approved" }] },
                },
            };
            const wrapper = mount(ViewWorkflowTransition, { props: { app: "a", model: "m", pk: "1" } });
            await vue.nextTick();
            expect(wrapper.find("[data-tone]").attributes("data-tone")).toBe("neutral");
        });
    });
});
