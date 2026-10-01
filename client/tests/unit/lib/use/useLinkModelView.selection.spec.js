import { scopedIt } from "@tests/unit/utils.js";
import { useLinkModelView } from "@vueda/use/useLinkModelView.js";
import flushPromises from "flush-promises";
import { reactive } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

const { routerState } = vi.hoisted(() => ({
    routerState: {},
}));

vi.mock("@vueda/use/useModelConfig.js", () => ({
    useModelConfig: () => ({ config: { actionDetails: { bulk: { bulk: true } } } }),
}));
vi.mock("@vueda/use/useWorkflowTransitions.js", () => ({
    useWorkflowTransitions: () => ({ transitions: [{ code: "approve" }] }),
}));
vi.mock("vue-router", async (importOriginal) => ({
    ...(await importOriginal()),
    useRouter: () => routerState.router,
}));

describe("lib/use/useLinkModelView.js", () => {
    beforeEach(() => {
        routerState.router = createRouter({
            history: createMemoryHistory(),
            routes: [{ path: "/:app/:model/:action", name: "actionrouter.listview", component: {} }],
        });
    });

    describe("bulk selection", () => {
        scopedIt.each(["bulk", "approve"])("updates %s links as the selection changes", async (view) => {
            const props = reactive({ app: "catalog", model: "item", view, pk: ["20"] });
            const { href, navigate, actionDisabled } = useLinkModelView(props);
            await flushPromises();
            const selectedPKs = () => routerState.router.resolve(href.value).query.pk;
            expect(selectedPKs()).toBe("20");

            props.pk.push("73");
            await flushPromises();
            expect(selectedPKs()).toBe("20,73");
            await navigate();
            expect(routerState.router.currentRoute.value.query.pk).toBe("20,73");

            props.pk.splice(0, 1);
            await flushPromises();
            expect(selectedPKs()).toBe("73");

            props.pk.length = 0;
            await flushPromises();
            expect(selectedPKs()).toBe("");
            expect(actionDisabled.value).toBe(true);

            props.pk = ["91"];
            await flushPromises();
            expect(selectedPKs()).toBe("91");
            expect(actionDisabled.value).toBe(false);
        });
    });
});
