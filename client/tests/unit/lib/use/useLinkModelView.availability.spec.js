import { scopedIt } from "@tests/unit/utils.js";
import { useLinkModelView } from "@vueda/use/useLinkModelView.js";
import flushPromises from "flush-promises";
import { reactive, watch } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const { state } = vi.hoisted(() => ({ state: {} }));

vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: () => state.modelConfig,
}));
vi.mock("@vueda/use/useWorkflowTransitions.js", () => ({
    useWorkflowTransitions: () => state.workflow,
}));
vi.mock("vue-router", async (importOriginal) => ({
    ...(await importOriginal()),
    useRouter: () => state.router,
}));

const detail = { detail: true, bulk: false };

const makeRouter = (routes) => createRouter({ history: createMemoryHistory(), routes });
const actionRoutes = [
    { path: "/:app/:model/:action", name: "actionrouter.listview", component: {} },
    { path: "/:app/:model/:pk/:action", name: "actionrouter.detailview", component: {} },
];

const link = async (props) => {
    const result = useLinkModelView(reactive({ app: "hr", model: "employee", pk: "7", ...props }));
    await flushPromises();
    return result;
};

describe("lib/use/useLinkModelView.js", () => {
    beforeEach(() => {
        state.modelConfig = reactive({ loading: false, errored: false, config: { actionDetails: {} } });
        state.workflow = reactive({ transitions: [] });
        state.router = makeRouter(actionRoutes);
    });

    describe("view availability", () => {
        scopedIt("is not linkable when the model info lacks the view's action", async () => {
            state.modelConfig.config.actionDetails = { list: { detail: false, bulk: false } };
            const { linkable, view } = await link({ view: "update" });
            expect(linkable.value).toBe(false);
            expect(view.value).toBe("update");
        });

        scopedIt("links to the target's primary key when the model info includes the action", async () => {
            state.modelConfig.config.actionDetails = { retrieve: detail };
            const { linkable, href } = await link({ view: "read" });
            expect(linkable.value).toBe(true);
            expect(href.value).toBe("/hr/employee/7/read");
        });

        scopedIt("is not linkable when the view's route does not resolve", async () => {
            state.modelConfig.config.actionDetails = { retrieve: detail };
            state.router = makeRouter([{ path: "/", name: "home", component: {} }]);
            const { linkable, href } = await link({ view: "read" });
            expect(linkable.value).toBe(false);
            expect(href.value).toBeUndefined();
        });

        scopedIt("is not linkable when a view that needs a primary key has none", async () => {
            state.modelConfig.config.actionDetails = { retrieve: detail };
            const { linkable } = await link({ view: "read", pk: undefined });
            expect(linkable.value).toBe(false);
        });

        scopedIt("becomes linkable once, with the primary key, when the model info finishes loading", async () => {
            state.modelConfig.loading = true;
            const { linkable, href } = await link({ view: "read" });
            expect(linkable.value).toBe(false);

            const linkedStates = [];
            watch(
                [linkable, href],
                ([isLinkable, url]) => {
                    if (isLinkable) {
                        linkedStates.push(url);
                    }
                },
                { flush: "post" },
            );
            // useModelConfig assigns the config, then clears loading in a later microtask.
            Promise.resolve()
                .then(() => {
                    state.modelConfig.config = { actionDetails: { retrieve: detail } };
                })
                .finally(() => {
                    state.modelConfig.loading = false;
                });
            await flushPromises();

            expect(linkedStates).toEqual(["/hr/employee/7/read"]);
            expect(linkable.value).toBe(true);
            expect(href.value).toBe("/hr/employee/7/read");
        });

        scopedIt("is not linkable when the model info fails to load", async () => {
            state.modelConfig.config.actionDetails = { retrieve: detail };
            state.modelConfig.errored = true;
            const { linkable } = await link({ view: "read" });
            expect(linkable.value).toBe(false);
        });

        scopedIt("counts a workflow transition that the viewer can perform as available", async () => {
            state.workflow.transitions = [{ code: "approve", name: "Approve" }];
            const { linkable, href } = await link({ view: "approve" });
            expect(linkable.value).toBe(true);
            expect(href.value).toBe("/hr/employee/7/approve");
        });
    });

    describe("ordered views", () => {
        const views = ["update", "read"];

        scopedIt("links to update for a viewer who can update", async () => {
            state.modelConfig.config.actionDetails = { retrieve: detail, update: detail };
            const { linkable, view, href } = await link({ view: views });
            expect(linkable.value).toBe(true);
            expect(view.value).toBe("update");
            expect(href.value).toBe("/hr/employee/7/update");
        });

        scopedIt("links to read for a viewer who can only read", async () => {
            state.modelConfig.config.actionDetails = { retrieve: detail };
            const { linkable, view, href } = await link({ view: views });
            expect(linkable.value).toBe(true);
            expect(view.value).toBe("read");
            expect(href.value).toBe("/hr/employee/7/read");
        });

        scopedIt("is not linkable for a viewer who can do neither", async () => {
            state.modelConfig.config.actionDetails = { list: { detail: false, bulk: false } };
            const { linkable, view } = await link({ view: views });
            expect(linkable.value).toBe(false);
            expect(view.value).toBe("update");
        });

        scopedIt("skips an available view whose route does not resolve", async () => {
            state.modelConfig.config.actionDetails = { retrieve: detail, update: detail };
            state.router = makeRouter([
                { path: "/:app/:model/:pk/read", name: "actionrouter.detailview", component: {} },
            ]);
            const { view, href } = await link({ view: views });
            expect(view.value).toBe("update");
            expect(href.value).toBe("/hr/employee/7/read");
        });

        scopedIt("moves to update when the viewer gains the update action", async () => {
            state.modelConfig.config.actionDetails = { retrieve: detail };
            const { view } = await link({ view: views });
            expect(view.value).toBe("read");

            state.modelConfig.config.actionDetails = { retrieve: detail, update: detail };
            await flushPromises();
            expect(view.value).toBe("update");
        });
    });

    describe("button state when no view is linkable", () => {
        scopedIt("keeps the first view's href and disabled state", async () => {
            const { linkable, view, href, actionDisabled } = await link({ view: "approve", pk: "7" });
            expect(linkable.value).toBe(false);
            expect(view.value).toBe("approve");
            expect(href.value).toBe("/hr/employee/approve");
            expect(actionDisabled.value).toBe(false);
        });
    });
});
