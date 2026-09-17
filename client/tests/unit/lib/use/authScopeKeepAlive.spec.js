import { scopedIt } from "@tests/unit/utils.js";
import { useModelChoices } from "@vueda/use/useModelChoices.js";
import { useModelInfo } from "@vueda/use/useModelInfo.js";
import { useWorkflowTransitions } from "@vueda/use/useWorkflowTransitions.js";
import { AuthScopeInvalidatedError } from "@vueda/utils/errors.js";
import flushPromises from "flush-promises";
import { KeepAlive, createApp, defineComponent, h, reactive, ref } from "vue";

// Keep the real lifecycle hooks and loading helpers; only store requests are controlled.
const mocks = vi.hoisted(() => ({ user: null, info: null, choices: null, workflow: null }));
vi.mock("@vueda/stores/storeUser.js", () => ({ storeUser: () => mocks.user }));
vi.mock("@vueda/stores/storeModelInfo.js", () => ({ storeModelInfo: () => mocks.info }));
vi.mock("@vueda/stores/storeModelChoices.js", () => ({ storeModelChoices: () => mocks.choices }));
vi.mock("@vueda/stores/storeWorkflow.js", () => ({
    storeWorkflow: () => mocks.workflow,
    getUsingVuedaWorkflow: () => true,
}));

describe("lib/use/use*.js", () => {
    describe("identity change while deactivated by KeepAlive", () => {
        for (const kind of ["info", "choices", "filterChoices", "workflow"]) {
            for (const returnBeforeSettle of [true, false]) {
                scopedIt(
                    `${kind}: reactivate ${returnBeforeSettle ? "before" : "after"} old fetch settles`,
                    async () => {
                        mocks.user = reactive({ identityGeneration: 0 });
                        const key = "blog.article";
                        let rejectFirst;
                        const fetch = vi.fn().mockImplementationOnce(
                            () =>
                                new Promise((resolve, reject) => {
                                    rejectFirst = reject;
                                }),
                        );
                        const fresh = kind === "info" ? { label: "new user" } : ["new user"];
                        mocks.info = reactive({ infos: {}, fetchModelInfo: fetch });
                        mocks.choices = reactive({
                            choices: {},
                            filterChoices: {},
                            fetchChoices: fetch,
                            fetchFilterChoices: fetch,
                            initializeChoice: vi.fn(),
                        });
                        mocks.workflow = reactive({ workflowTransitions: {}, fetchWorkflowTransition: fetch });
                        fetch.mockImplementation(() => {
                            if (kind === "info") mocks.info.infos[key] = fresh;
                            else if (kind === "workflow") mocks.workflow.workflowTransitions[key] = fresh;
                            else mocks.choices[kind][key] = { status: fresh };
                            return Promise.resolve();
                        });
                        let result;
                        const child = defineComponent({
                            setup() {
                                if (kind === "info") result = useModelInfo(ref("blog"), ref("article"));
                                else if (kind === "workflow")
                                    result = useWorkflowTransitions(ref("blog"), ref("article"));
                                else
                                    result = useModelChoices(
                                        reactive({
                                            status: {
                                                app: "blog",
                                                model: "article",
                                                intendToFetch: true,
                                                isFilter: kind === "filterChoices",
                                            },
                                        }),
                                    );
                                return () => null;
                            },
                        });
                        const visible = ref(true);
                        const app = createApp({
                            render: () => h(KeepAlive, null, { default: () => (visible.value ? h(child) : null) }),
                        });
                        try {
                            app.mount(document.createElement("div"));
                            await flushPromises();
                            expect(fetch).toHaveBeenCalledTimes(1);
                            expect(result.loading).toBe(true);
                            // Deactivate first, then change identity in a separate watch flush.
                            visible.value = false;
                            await flushPromises();
                            mocks.user.identityGeneration++;
                            await flushPromises();
                            expect(fetch).toHaveBeenCalledTimes(1);
                            // Returning before settlement must preserve the queued retry.
                            if (returnBeforeSettle) {
                                visible.value = true;
                                await flushPromises();
                                expect(fetch).toHaveBeenCalledTimes(1);
                            }
                            rejectFirst(new AuthScopeInvalidatedError("store.fetch", key));
                            await flushPromises();
                            if (!returnBeforeSettle) {
                                // An inactive component must wait for reactivation to fetch.
                                expect(fetch).toHaveBeenCalledTimes(1);
                                visible.value = true;
                                await flushPromises();
                            }
                            expect(result.loading).toBe(false);
                            expect(result.errored).toBe(false);
                            expect(fetch).toHaveBeenCalledTimes(2);
                            const data =
                                kind === "info"
                                    ? result.info
                                    : kind === "workflow"
                                      ? result.transitions
                                      : result.choices.status;
                            expect(data).toEqual(fresh);
                        } finally {
                            app.unmount();
                        }
                    },
                );
            }
        }
    });
});
