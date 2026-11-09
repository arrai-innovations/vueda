import { scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { defineComponent, h, reactive } from "vue";

enableAutoUnmount(afterEach);

const stub = (name) =>
    defineComponent({
        name,
        setup() {
            return () => h("div", { "data-qa": name });
        },
    });
const VuedaListStub = stub("VuedaListStub");
const ProjectHistoryListStub = stub("ProjectHistoryListStub");

vi.mock("@vueda/views/ViewLoading.vue", () => ({ default: stub("LoadingStub") }));
vi.mock("@vueda/views/ViewAction.vue", () => ({ default: stub("ActionStub") }));
vi.mock("@vueda/views/ViewActionNotFound.vue", () => ({ default: stub("NotFoundStub") }));
vi.mock("@vueda/views/ViewExecuteTransition.vue", () => ({ default: stub("ExecuteTransitionStub") }));
vi.mock("@vueda/views/ViewList.vue", () => ({ default: VuedaListStub }));

// The project has a model-specific history-list view for app "a" / model "b", and no list view.
vi.mock("@vueda/utils/projectViewOverrides.js", () => ({
    projectViews: {
        "ViewHistoryListAB.vue": async () => ({ default: ProjectHistoryListStub }),
    },
    warnUnmatchedProjectViews: vi.fn(),
}));

const modelConfig = reactive({ loading: false, info: { actions: [] } });
const workflow = reactive({ loading: false, transitions: [] });
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => modelConfig }));
vi.mock("@vueda/use/useWorkflowTransitions.js", () => ({ useWorkflowTransitions: () => workflow }));

let ViewActionRouter;

beforeEach(async () => {
    ViewActionRouter = (await import("@vueda/views/ViewActionRouter.vue")).default;
});

describe("lib/views/ViewActionRouter.vue", () => {
    describe("Built-in actions through the default registry loaders", () => {
        scopedIt("renders the model-specific project view that the default loader finds", async () => {
            modelConfig.info = { actions: [{ name: "history-list" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "history-list" } });
            await vi.waitFor(() => expect(wrapper.findComponent(ProjectHistoryListStub).exists()).toBe(true));
            // The stub declares no props, so the route's props reach its root element as attributes.
            expect(wrapper.findComponent(ProjectHistoryListStub).attributes()).toMatchObject({
                app: "a",
                model: "b",
                action: "history-list",
            });
        });

        scopedIt("renders the VUEDA view when the project has no file for the action", async () => {
            modelConfig.info = { actions: [{ name: "list" }] };
            const wrapper = mount(ViewActionRouter, { props: { app: "a", model: "b", action: "list" } });
            await vi.waitFor(() => expect(wrapper.findComponent(VuedaListStub).exists()).toBe(true));
        });
    });
});
