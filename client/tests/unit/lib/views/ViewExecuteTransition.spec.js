import { mockProvideInject, scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

var provideStore, mockedProvide, mockedInject;

const mockedUseLookupContext = vi.fn();
vi.mock("@vueda/use/useLookupContext.js", () => ({
    useLookupContext: mockedUseLookupContext,
}));

let modelConfig;
vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: () => modelConfig,
}));

const mockedUsePageTitle = vi.fn();
vi.mock("@vueda/use/usePageTitle.js", () => ({
    usePageTitle: mockedUsePageTitle,
}));

const { makeUseThemeMock } = await vi.hoisted(() => import("@tests/unit/themeStub.js"));
const mockedUseTheme = makeUseThemeMock({
    slotResolver: (key) => (key === "root" ? "theme-root" : ""),
});
vi.mock("@vueda/use/useTheme.js", () => ({
    useTheme: mockedUseTheme,
    THEME_OVERRIDE_PROPS: {},
}));

vi.mock("@vueda/utils/case.js", async () => {
    const { default: startCase } = await import("lodash-es/startCase.js");
    return {
        memoizedStartCase: startCase,
        getLowerTitle: (v) => v.toLowerCase(),
        getPluralizedTitle: (v) => `${v}s`,
    };
});

const routerBack = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ back: routerBack }),
}));

const executeTransition = vi.fn();
const workflowStore = { executeTransition };
vi.mock("@vueda/stores/storeWorkflow.js", () => ({
    storeWorkflow: () => workflowStore,
}));

let workflowTransitions;
vi.mock("@vueda/use/useWorkflowTransitions.js", () => ({
    useWorkflowTransitions: () => workflowTransitions,
}));

const ModelActionFormStub = defineComponent({
    name: "ModelActionFormStub",
    props: [
        "app",
        "model",
        "action",
        "actionVerboseName",
        "runAction",
        "pk",
        "skippedPks",
        "pkNotices",
        "bannerDescription",
    ],
    setup(props, { attrs, slots }) {
        return () =>
            h(
                "div",
                {
                    "data-qa": "model-action-form",
                    "data-app": props.app,
                    "data-model": props.model,
                    "data-action": props.action,
                    "data-action-verbose-name": props.actionVerboseName,
                    ...attrs,
                },
                Object.keys(slots).map((name) => h("div", { "data-slot": name }, slots[name] ? slots[name]() : null)),
            );
    },
});
vi.mock("@vueda/views/ModelActionForm.vue", () => ({
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
    return {
        __esModule: true,
        ...actual,
        inject: mockedInject,
        provide: mockedProvide,
    };
});

let ViewExecuteTransition, vue;

beforeEach(async () => {
    vue = await vi.importActual("vue");
    modelConfig = vue.reactive({ config: { verboseName: "", verboseNamePlural: "" }, info: {} });
    mockedUsePageTitle.mockClear();
    workflowTransitions = vue.reactive({ transitions: [] });
    ViewExecuteTransition = (await import("@vueda/views/ViewExecuteTransition.vue")).default;
    mockedUseLookupContext.mockClear();
    mockedUseTheme.mockClear();
    routerBack.mockClear();
    executeTransition.mockReset();
    // The store returns a promise for every run, and the view reads a bulk run's outcome from it.
    executeTransition.mockImplementation(() => Promise.resolve({}));
    provideStore.clear();
});

describe("lib/views/ViewExecuteTransition.vue", () => {
    describe("Lookup context", () => {
        scopedIt("calls useLookupContext if lookup context is missing", () => {
            mockedInject.mockReturnValueOnce(null);
            mount(ViewExecuteTransition, { props: { app: "app", model: "model", action: "approve" } });
            expect(mockedUseLookupContext).toHaveBeenCalled();
        });

        scopedIt("does not call useLookupContext when lookup context exists", () => {
            mockedInject.mockReturnValueOnce({});
            mount(ViewExecuteTransition, { props: { app: "app", model: "model", action: "approve" } });
            expect(mockedUseLookupContext).not.toHaveBeenCalled();
        });
    });

    describe("Rendering and slot forwarding", () => {
        scopedIt("passes the route's transition code verbatim, plus app/model/pk, to ModelActionForm", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "myApp", model: "invoice", action: "Send_ForReview", pk: "id123" },
            });
            const af = wrapper.find('[data-qa="model-action-form"]');
            expect(af.attributes("data-app")).toBe("myApp");
            expect(af.attributes("data-model")).toBe("invoice");
            expect(af.attributes("data-action")).toBe("Send_ForReview");
            expect(wrapper.findComponent(ModelActionFormStub).props("pk")).toBe("id123");
        });

        scopedIt("forwards attrs (other than class) and slots to ModelActionForm", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "person", action: "approve", class: "custom" },
                attrs: { foo: "bar" },
                slots: {
                    "warning-entry": '<span data-qa="custom-warning-entry">entry</span>',
                },
            });
            const af = wrapper.find('[data-qa="model-action-form"]');
            expect(af.attributes("foo")).toBe("bar");
            expect(af.find('[data-slot="warning-entry"] [data-qa="custom-warning-entry"]').exists()).toBe(true);
        });

        scopedIt("applies theme root and registers the theme entry", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "person", action: "approve", class: "custom" },
            });
            const root = wrapper.find('[data-qa="view-execute-transition-root"]');
            expect(root.classes()).toContain("theme-root");
            expect(root.classes()).toContain("custom");
            expect(mockedUseTheme).toHaveBeenCalledWith("ViewExecuteTransition", expect.any(Object));
        });
    });

    describe("Transition display name", () => {
        scopedIt("resolves action-verbose-name from the matching transition's display name, lower-cased", () => {
            mockedInject.mockReturnValueOnce({});
            workflowTransitions.transitions = [
                { code: "approve", name: "Approve invoice" },
                { code: "reject", name: "Reject invoice" },
            ];
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve" },
            });
            // Lower-cased for `useModelAction`'s confirm-prompt sentence contract ("Are you sure you
            // want to {verb} the selected {model}?"); the page title keeps the cased display name.
            expect(wrapper.find('[data-qa="model-action-form"]').attributes("data-action-verbose-name")).toBe(
                "approve invoice",
            );
        });

        scopedIt("falls back to a lower-cased, start-cased transition code when no transition matches yet", () => {
            mockedInject.mockReturnValueOnce({});
            workflowTransitions.transitions = [{ code: "reject", name: "Reject invoice" }];
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve" },
            });
            expect(wrapper.find('[data-qa="model-action-form"]').attributes("data-action-verbose-name")).toBe(
                "approve",
            );
        });
    });

    describe("Page title", () => {
        // The view contributes its title through `usePageTitle(source)`; read the registered getter.
        const pageTitle = () => mockedUsePageTitle.mock.calls[0][0]().title;

        scopedIt("defaults to the transition display name as written, followed by the model's verbose name", () => {
            mockedInject.mockReturnValueOnce({});
            workflowTransitions.transitions = [{ code: "submit", name: "Submit for approval" }];
            modelConfig.config.verboseName = "purchase order";
            mount(ViewExecuteTransition, {
                props: { app: "catalog", model: "purchaseorder", action: "submit", pk: "4" },
            });
            expect(pageTitle()).toBe("Submit for approval Purchase Order");
        });

        scopedIt("keeps the punctuation of a written display name", () => {
            mockedInject.mockReturnValueOnce({});
            workflowTransitions.transitions = [{ code: "reopen", name: "Re-open" }];
            modelConfig.config.verboseName = "purchase order";
            mount(ViewExecuteTransition, {
                props: { app: "catalog", model: "purchaseorder", action: "reopen", pk: "4" },
            });
            expect(pageTitle()).toBe("Re-open Purchase Order");
        });

        scopedIt("falls back to the start-cased transition code when no transition matches yet", () => {
            mockedInject.mockReturnValueOnce({});
            modelConfig.config.verboseName = "purchase order";
            mount(ViewExecuteTransition, {
                props: { app: "catalog", model: "purchaseorder", action: "submit_for_approval", pk: "4" },
            });
            expect(pageTitle()).toBe("Submit For Approval Purchase Order");
        });

        scopedIt("uses the verbose plural name when pk lists more than one object", () => {
            mockedInject.mockReturnValueOnce({});
            workflowTransitions.transitions = [{ code: "approve", name: "Approve" }];
            modelConfig.config.verboseName = "purchase order";
            modelConfig.config.verboseNamePlural = "purchase orders";
            mount(ViewExecuteTransition, {
                props: { app: "catalog", model: "purchaseorder", action: "approve", pk: ["4", "5"] },
            });
            expect(pageTitle()).toBe("Approve Purchase Orders");
        });

        scopedIt("is empty until the verbose name is known, then resolves", () => {
            mockedInject.mockReturnValueOnce({});
            workflowTransitions.transitions = [{ code: "submit", name: "Submit for approval" }];
            mount(ViewExecuteTransition, {
                props: { app: "catalog", model: "purchaseorder", action: "submit", pk: "4" },
            });
            expect(pageTitle()).toBe("");
            modelConfig.config.verboseName = "purchase order";
            expect(pageTitle()).toBe("Submit for approval Purchase Order");
        });

        scopedIt("uses the title prop when given, even before the verbose name is known", () => {
            mockedInject.mockReturnValueOnce({});
            mount(ViewExecuteTransition, {
                props: { app: "catalog", model: "purchaseorder", action: "submit", title: "Send Order Upstream" },
            });
            expect(pageTitle()).toBe("Send Order Upstream");
        });
    });

    describe("Submission", () => {
        scopedIt("run-action sends a dry run for one object as a list, with the transition code verbatim", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve", pk: "7" },
            });
            const runAction = wrapper.findComponent(ModelActionFormStub).props("runAction");
            runAction({ dryRun: true, acknowledgeWarnings: "digest-1" });
            expect(executeTransition).toHaveBeenCalledWith(
                "app",
                "invoice",
                ["7"],
                "approve",
                expect.any(Object),
                undefined,
                true,
                "digest-1",
            );
        });

        scopedIt("run-action defaults dryRun to false and forwards undefined acknowledgeWarnings when omitted", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve", pk: "7" },
            });
            const runAction = wrapper.findComponent(ModelActionFormStub).props("runAction");
            runAction();
            expect(executeTransition).toHaveBeenCalledWith(
                "app",
                "invoice",
                "7",
                "approve",
                expect.any(Object),
                undefined,
                false,
                undefined,
            );
        });

        scopedIt("run-action forwards a bulk pk array unchanged for bulk transitions", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve", pk: ["1", "2"] },
            });
            const runAction = wrapper.findComponent(ModelActionFormStub).props("runAction");
            runAction();
            expect(executeTransition).toHaveBeenCalledWith(
                "app",
                "invoice",
                ["1", "2"],
                "approve",
                expect.any(Object),
                undefined,
                false,
                undefined,
            );
        });
    });

    describe("Skipping refused objects", () => {
        const refusedBody = {
            target_state: { code: "approved", name: "Approved" },
            objects: {
                1: { state: { code: "draft", name: "Draft" } },
                2: {
                    state: { code: "approved", name: "Approved" },
                    errors: ["Already in the Approved state."],
                    already_in_target_state: true,
                },
                3: { state: { code: "void", name: "Void" }, errors: ["Approve is not available from the Void state."] },
            },
        };

        const mountBulk = (pk = ["1", "2", "3"]) => {
            mockedInject.mockReturnValueOnce({});
            return mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve", pk },
            });
        };

        const runRefusedDryRun = async (wrapper) => {
            executeTransition.mockReturnValueOnce(
                Promise.reject(Object.assign(new Error("400"), { responseData: refusedBody })),
            );
            const request = wrapper.findComponent(ModelActionFormStub).props("runAction")({ dryRun: true });
            await request.catch(() => {});
            await vue.nextTick();
        };

        scopedIt(
            "skips every object that the dry run refused, and notes only the ones already in the target state",
            async () => {
                const wrapper = mountBulk();

                await runRefusedDryRun(wrapper);

                const form = wrapper.findComponent(ModelActionFormStub);
                expect(form.props("skippedPks")).toEqual(["2", "3"]);
                expect(form.props("pkNotices")).toEqual({ 2: "Already in the Approved state." });
            },
        );

        scopedIt("sends only the objects that the dry run did not refuse", async () => {
            const wrapper = mountBulk();
            await runRefusedDryRun(wrapper);
            executeTransition.mockClear();

            wrapper.findComponent(ModelActionFormStub).props("runAction")();

            expect(executeTransition).toHaveBeenCalledWith(
                "app",
                "invoice",
                ["1"],
                "approve",
                expect.any(Object),
                undefined,
                false,
                undefined,
            );
        });

        scopedIt("sends every selected object in a dry run, even after one refused some", async () => {
            const wrapper = mountBulk();
            await runRefusedDryRun(wrapper);
            executeTransition.mockClear();
            executeTransition.mockReturnValueOnce(Promise.resolve({ objects: {} }));

            wrapper.findComponent(ModelActionFormStub).props("runAction")({ dryRun: true });

            expect(executeTransition.mock.calls[0][2]).toEqual(["1", "2", "3"]);
        });

        scopedIt("skips nothing after a dry run that refuses no object", async () => {
            const wrapper = mountBulk();
            await runRefusedDryRun(wrapper);
            executeTransition.mockReturnValueOnce(
                Promise.resolve({ target_state: {}, objects: { 1: {}, 2: {}, 3: {} } }),
            );

            await wrapper.findComponent(ModelActionFormStub).props("runAction")({ dryRun: true });
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("skippedPks")).toEqual([]);
        });

        scopedIt("adds the objects that a refused confirm reports to the skipped ones", async () => {
            const wrapper = mountBulk(["1", "2", "3", "4"]);
            await runRefusedDryRun(wrapper);
            const confirmBody = {
                target_state: { code: "approved", name: "Approved" },
                objects: {
                    1: { state: { code: "draft", name: "Draft" } },
                    4: {
                        state: { code: "void", name: "Void" },
                        errors: ["Approve is not available from the Void state."],
                    },
                },
            };
            executeTransition.mockReturnValueOnce(
                Promise.reject(Object.assign(new Error("400"), { responseData: confirmBody })),
            );

            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")()
                .catch(() => {});
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("skippedPks")).toEqual(["2", "3", "4"]);
        });

        scopedIt("sends an object whose key names an Object property, such as constructor", async () => {
            const wrapper = mountBulk(["constructor", "abc"]);
            executeTransition.mockReturnValueOnce(
                Promise.resolve({ target_state: {}, objects: { constructor: {}, abc: {} } }),
            );
            await wrapper.findComponent(ModelActionFormStub).props("runAction")({ dryRun: true });
            await vue.nextTick();
            executeTransition.mockClear();

            wrapper.findComponent(ModelActionFormStub).props("runAction")();

            expect(executeTransition.mock.calls[0][2]).toEqual(["constructor", "abc"]);
        });

        scopedIt("skips a refused object whose key is __proto__", async () => {
            const wrapper = mountBulk(["__proto__", "abc"]);
            // JSON.parse keeps "__proto__" as an ordinary key, as a real response body does.
            const responseData = JSON.parse(
                '{"target_state": {"code": "approved", "name": "Approved"}, "objects": ' +
                    '{"__proto__": {"state": null, "errors": ["Not from here."]}, "abc": {"state": null}}}',
            );
            executeTransition.mockReturnValueOnce(Promise.reject(Object.assign(new Error("400"), { responseData })));
            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")({ dryRun: true })
                .catch(() => {});
            await vue.nextTick();
            executeTransition.mockClear();

            wrapper.findComponent(ModelActionFormStub).props("runAction")();

            expect(wrapper.findComponent(ModelActionFormStub).props("skippedPks")).toEqual(["__proto__"]);
            expect(executeTransition.mock.calls[0][2]).toEqual(["abc"]);
        });

        scopedIt("keeps a one-entry array on the list route for a confirm", () => {
            const wrapper = mountBulk(["5"]);

            wrapper.findComponent(ModelActionFormStub).props("runAction")();

            expect(executeTransition.mock.calls[0][2]).toEqual(["5"]);
        });

        scopedIt("keeps an object whose row was locked in the next confirm", async () => {
            const wrapper = mountBulk();
            await runRefusedDryRun(wrapper);
            executeTransition.mockReturnValueOnce(
                Promise.reject(
                    Object.assign(new Error("400"), {
                        responseData: {
                            target_state: { code: "approved", name: "Approved" },
                            objects: {
                                1: {
                                    state: { code: "draft", name: "Draft" },
                                    errors: ["This object cannot be updated right now. Please try again."],
                                    locked: true,
                                },
                            },
                        },
                    }),
                ),
            );

            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")()
                .catch(() => {});
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("skippedPks")).toEqual(["2", "3"]);
        });

        scopedIt("passes no primary key when none is selected, so the store rejects the run", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve", pk: undefined },
            });

            wrapper.findComponent(ModelActionFormStub).props("runAction")({ dryRun: true });

            expect(executeTransition.mock.calls[0][2]).toBeUndefined();
        });

        scopedIt("keeps the skipped objects when a confirm fails without a body of objects", async () => {
            const wrapper = mountBulk();
            await runRefusedDryRun(wrapper);
            executeTransition.mockReturnValueOnce(Promise.reject(new Error("network")));

            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")()
                .catch(() => {});
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("skippedPks")).toEqual(["2", "3"]);
        });

        scopedIt("clears the refusals after a dry run that answers without objects", async () => {
            const wrapper = mountBulk();
            await runRefusedDryRun(wrapper);
            executeTransition.mockReturnValueOnce(Promise.resolve([]));

            await wrapper.findComponent(ModelActionFormStub).props("runAction")({ dryRun: true });
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("skippedPks")).toEqual([]);
        });

        scopedIt("forgets the refusals when the selection changes", async () => {
            const wrapper = mountBulk();
            await runRefusedDryRun(wrapper);

            await wrapper.setProps({ pk: ["1", "4"] });

            expect(wrapper.findComponent(ModelActionFormStub).props("skippedPks")).toEqual([]);
        });

        scopedIt("skips a single object that the dry run refused", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve", pk: "2" },
            });
            const singleBody = { target_state: refusedBody.target_state, objects: { 2: refusedBody.objects[2] } };
            executeTransition.mockReturnValueOnce(
                Promise.reject(Object.assign(new Error("400"), { responseData: singleBody })),
            );

            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")({ dryRun: true })
                .catch(() => {});
            await vue.nextTick();

            const form = wrapper.findComponent(ModelActionFormStub);
            expect(form.props("skippedPks")).toEqual(["2"]);
            expect(form.props("pkNotices")).toEqual({ 2: "Already in the Approved state." });
        });

        scopedIt("sends a confirm for one object as its primary key alone", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "invoice", action: "approve", pk: "2" },
            });

            wrapper.findComponent(ModelActionFormStub).props("runAction")();

            expect(executeTransition.mock.calls[0][2]).toBe("2");
        });
    });

    describe("Banner description", () => {
        const runDryRun = async (wrapper, objects) => {
            executeTransition.mockReturnValueOnce(
                Promise.resolve({ target_state: { code: "approved", name: "Approved" }, objects }),
            );
            await wrapper.findComponent(ModelActionFormStub).props("runAction")({ dryRun: true });
            await vue.nextTick();
        };

        const mountWithNames = (pk) => {
            modelConfig.info = { verboseName: "invoice", verboseNamePlural: "invoices" };
            mockedInject.mockReturnValueOnce({});
            return mount(ViewExecuteTransition, { props: { app: "app", model: "invoice", action: "approve", pk } });
        };

        scopedIt("keeps the form's default description until a dry run answers", () => {
            const wrapper = mountWithNames(["1", "2"]);

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBeUndefined();
        });

        scopedIt("names the one source state and the target state", async () => {
            const wrapper = mountWithNames(["1", "2"]);

            await runDryRun(wrapper, {
                1: { state: { code: "draft", name: "Draft" } },
                2: { state: { code: "draft", name: "Draft" } },
            });

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "Moves the selected invoices from Draft to Approved.",
            );
        });

        scopedIt("lists each source state of a mixed selection", async () => {
            const wrapper = mountWithNames(["1", "2", "3"]);

            await runDryRun(wrapper, {
                1: { state: { code: "draft", name: "Draft" } },
                2: { state: { code: "void", name: "Void" } },
                3: { state: { code: "draft", name: "Draft" } },
            });

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "Moves the selected invoices to Approved. They are now in Draft or Void.",
            );
        });

        scopedIt("uses the singular name for one object", async () => {
            const wrapper = mountWithNames("1");

            await runDryRun(wrapper, { 1: { state: { code: "draft", name: "Draft" } } });

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "Moves the selected invoice from Draft to Approved.",
            );
        });

        scopedIt("counts the moving objects and leaves the states of skipped ones out", async () => {
            const wrapper = mountWithNames(["1", "2"]);
            executeTransition.mockReturnValueOnce(
                Promise.reject(
                    Object.assign(new Error("400"), {
                        responseData: {
                            target_state: { code: "approved", name: "Approved" },
                            objects: {
                                1: { state: { code: "draft", name: "Draft" } },
                                2: { state: { code: "void", name: "Void" }, errors: ["Not from Void."] },
                            },
                        },
                    }),
                ),
            );

            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")({ dryRun: true })
                .catch(() => {});
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "Moves 1 of the selected invoices from Draft to Approved.",
            );
        });

        scopedIt("says that nothing can move when every object is skipped", async () => {
            const wrapper = mountWithNames(["1", "2"]);
            executeTransition.mockReturnValueOnce(
                Promise.reject(
                    Object.assign(new Error("400"), {
                        responseData: {
                            target_state: { code: "approved", name: "Approved" },
                            objects: {
                                1: { state: { code: "void", name: "Void" }, errors: ["Not from Void."] },
                                2: { state: { code: "void", name: "Void" }, errors: ["Not from Void."] },
                            },
                        },
                    }),
                ),
            );

            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")({ dryRun: true })
                .catch(() => {});
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "None of the selected invoices can move to Approved.",
            );
        });

        scopedIt("names no source state when a moving object has no state", async () => {
            const wrapper = mountWithNames(["1", "2"]);

            await runDryRun(wrapper, { 1: { state: { code: "draft", name: "Draft" } }, 2: { state: null } });

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "Moves the selected invoices to Approved.",
            );
        });

        scopedIt("updates an object's state from a refused confirm", async () => {
            const wrapper = mountWithNames(["1", "2"]);
            await runDryRun(wrapper, {
                1: { state: { code: "draft", name: "Draft" } },
                2: { state: { code: "draft", name: "Draft" } },
            });
            executeTransition.mockReturnValueOnce(
                Promise.reject(
                    Object.assign(new Error("400"), {
                        responseData: {
                            target_state: { code: "approved", name: "Approved" },
                            objects: {
                                1: { state: { code: "draft", name: "Draft" } },
                                2: { state: { code: "void", name: "Void" }, errors: ["Not from Void."] },
                            },
                        },
                    }),
                ),
            );

            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")()
                .catch(() => {});
            await vue.nextTick();

            const form = wrapper.findComponent(ModelActionFormStub);
            expect(form.props("skippedPks")).toEqual(["2"]);
            expect(form.props("bannerDescription")).toBe("Moves 1 of the selected invoices from Draft to Approved.");
        });

        scopedIt("keeps the states when the parent passes a new array with the same keys", async () => {
            const wrapper = mountWithNames(["1", "2"]);
            await runDryRun(wrapper, {
                1: { state: { code: "draft", name: "Draft" } },
                2: { state: { code: "draft", name: "Draft" } },
            });

            await wrapper.setProps({ pk: ["1", "2"] });

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "Moves the selected invoices from Draft to Approved.",
            );
        });

        scopedIt("ignores a dry run that answers after the selection changed", async () => {
            const wrapper = mountWithNames(["1", "2"]);
            let answer;
            executeTransition.mockReturnValueOnce(
                new Promise((resolve) => {
                    answer = resolve;
                }),
            );
            const staleRequest = wrapper.findComponent(ModelActionFormStub).props("runAction")({ dryRun: true });

            await wrapper.setProps({ pk: ["3", "4"] });
            answer({
                target_state: { code: "approved", name: "Approved" },
                objects: { 1: { state: { code: "draft", name: "Draft" } } },
            });
            await staleRequest;
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBeUndefined();
        });

        scopedIt("says that the one selected object cannot move", async () => {
            const wrapper = mountWithNames("1");
            executeTransition.mockReturnValueOnce(
                Promise.reject(
                    Object.assign(new Error("400"), {
                        responseData: {
                            target_state: { code: "approved", name: "Approved" },
                            objects: { 1: { state: { code: "void", name: "Void" }, errors: ["Not from Void."] } },
                        },
                    }),
                ),
            );

            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")({ dryRun: true })
                .catch(() => {});
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "The selected invoice cannot move to Approved.",
            );
        });

        scopedIt("names the states from a refused confirm when no dry run reported them", async () => {
            const wrapper = mountWithNames(["1", "2"]);
            executeTransition.mockReturnValueOnce(
                Promise.reject(
                    Object.assign(new Error("400"), {
                        responseData: {
                            target_state: { code: "approved", name: "Approved" },
                            objects: {
                                1: { state: { code: "draft", name: "Draft" } },
                                2: { state: { code: "draft", name: "Draft" } },
                            },
                        },
                    }),
                ),
            );

            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")()
                .catch(() => {});
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "Moves the selected invoices from Draft to Approved.",
            );
        });

        scopedIt("keeps the banner after a confirm succeeds, while the form redirects", async () => {
            const wrapper = mountWithNames(["1", "2"]);
            await runDryRun(wrapper, {
                1: { state: { code: "draft", name: "Draft" } },
                2: { state: { code: "draft", name: "Draft" } },
            });
            executeTransition.mockReturnValueOnce(Promise.resolve({ target_state: {}, objects: {} }));

            await wrapper.findComponent(ModelActionFormStub).props("runAction")();
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "Moves the selected invoices from Draft to Approved.",
            );
        });

        scopedIt("says that every selected object is already in the target state", async () => {
            const wrapper = mountWithNames(["1", "2"]);
            const alreadyThere = {
                state: { code: "approved", name: "Approved" },
                errors: ["Already in the Approved state."],
                already_in_target_state: true,
            };
            executeTransition.mockReturnValueOnce(
                Promise.reject(
                    Object.assign(new Error("400"), {
                        responseData: {
                            target_state: { code: "approved", name: "Approved" },
                            objects: { 1: alreadyThere, 2: alreadyThere },
                        },
                    }),
                ),
            );

            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")({ dryRun: true })
                .catch(() => {});
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "All of the selected invoices are already in Approved.",
            );
        });

        scopedIt("says that the one selected object is already in the target state", async () => {
            const wrapper = mountWithNames("1");
            executeTransition.mockReturnValueOnce(
                Promise.reject(
                    Object.assign(new Error("400"), {
                        responseData: {
                            target_state: { code: "approved", name: "Approved" },
                            objects: {
                                1: {
                                    state: { code: "approved", name: "Approved" },
                                    errors: ["Already in the Approved state."],
                                    already_in_target_state: true,
                                },
                            },
                        },
                    }),
                ),
            );

            await wrapper
                .findComponent(ModelActionFormStub)
                .props("runAction")({ dryRun: true })
                .catch(() => {});
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBe(
                "The selected invoice is already in Approved.",
            );
        });

        scopedIt("clears the banner after a dry run that reports no target state", async () => {
            const wrapper = mountWithNames(["1", "2"]);
            await runDryRun(wrapper, {
                1: { state: { code: "draft", name: "Draft" } },
                2: { state: { code: "draft", name: "Draft" } },
            });
            executeTransition.mockReturnValueOnce(
                Promise.resolve({ objects: { 1: { state: { code: "draft", name: "Draft" } } } }),
            );

            await wrapper.findComponent(ModelActionFormStub).props("runAction")({ dryRun: true });
            await vue.nextTick();

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBeUndefined();
        });

        scopedIt("forgets the states when the selection changes", async () => {
            const wrapper = mountWithNames(["1", "2"]);
            await runDryRun(wrapper, { 1: { state: { code: "draft", name: "Draft" } } });

            await wrapper.setProps({ pk: ["1", "3"] });

            expect(wrapper.findComponent(ModelActionFormStub).props("bannerDescription")).toBeUndefined();
        });
    });

    describe("Navigation", () => {
        scopedIt("forwards return-button slot and falls back to Go Back button that calls router.back", async () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "model", action: "approve" },
            });
            await wrapper.find('[data-qa="prime-button"]').trigger("click");
            expect(routerBack).toHaveBeenCalled();
        });

        scopedIt("custom return-button slot replaces fallback Go Back button", () => {
            mockedInject.mockReturnValueOnce({});
            const wrapper = mount(ViewExecuteTransition, {
                props: { app: "app", model: "model", action: "approve" },
                slots: {
                    "return-button": "<button data-qa='custom-return'>back</button>",
                },
            });
            expect(wrapper.find('[data-qa="custom-return"]').exists()).toBe(true);
            expect(wrapper.find('[data-qa="prime-button"]').exists()).toBe(false);
        });
    });
});
