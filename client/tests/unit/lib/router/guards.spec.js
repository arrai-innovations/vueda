import { scopedIt } from "@tests/unit/utils.js";

let userStore;
let modelInfoStore;
let modelConfigStore;
let workflowStore;

const fetchCurrentUser = vi.fn();
const fetchModelInfo = vi.fn();
const getConfig = vi.fn();
const fetchWorkflowTransition = vi.fn();

class ModelInfoError extends Error {}

vi.mock("@vueda/stores/storeUser.js", () => ({
    storeUser: () => userStore,
}));

vi.mock("@vueda/stores/storeModelInfo.js", () => ({
    storeModelInfo: () => modelInfoStore,
    ModelInfoError,
}));

vi.mock("@vueda/stores/storeModelConfig.js", () => ({
    storeModelConfig: () => modelConfigStore,
}));

vi.mock("@vueda/stores/storeWorkflow.js", () => ({
    storeWorkflow: () => workflowStore,
}));

vi.mock("@vueda/utils/actionMap.js", () => ({
    getActionName: (name) => name,
}));

describe("lib/router/guards.js", () => {
    let guards;

    beforeEach(async () => {
        vi.resetModules();
        fetchCurrentUser.mockReset();
        fetchModelInfo.mockReset();
        getConfig.mockReset();
        fetchWorkflowTransition.mockReset();

        userStore = { initialized: false, loggedIn: false, loggedInUser: {}, fetchCurrentUser };
        modelInfoStore = { fetchModelInfo, actions: [] };
        modelConfigStore = { getConfig };
        workflowStore = { fetchWorkflowTransition };

        guards = await import("@vueda/router/guards.js");
    });

    scopedIt("waitForInitialising fetches user when needed", async () => {
        const result = await guards.waitForInitialising({});
        expect(fetchCurrentUser).toHaveBeenCalled();
        expect(result).toBe(userStore);
    });

    scopedIt("waitForModelStoreLoad gets stores", async () => {
        fetchWorkflowTransition.mockResolvedValue(["t"]);
        fetchModelInfo.mockResolvedValue("info");
        getConfig.mockResolvedValue("config");
        const result = await guards.waitForModelStoreLoad("a", "b", {});
        expect(fetchWorkflowTransition).toHaveBeenCalledWith("a", "b");
        expect(fetchModelInfo).toHaveBeenCalledWith({ app: "a", model: "b" });
        expect(getConfig).toHaveBeenCalledWith({ app: "a", model: "b" });
        expect(result).toEqual(["info", "config", ["t"]]);
    });

    scopedIt("requireAuth redirects when not logged in", async () => {
        const router = { resolve: vi.fn((r) => r) };
        const to = { fullPath: "/dest" };
        const result = await guards.requireAuth({ name: "login" }, to, router, {});
        expect(fetchCurrentUser).toHaveBeenCalled();
        expect(router.resolve).toHaveBeenCalledWith({ name: "login" });
        expect(result).toEqual({ name: "login", query: { redirect: "/dest" } });
    });

    scopedIt("requireAuth passes through when logged in", async () => {
        userStore.loggedIn = true;
        userStore.initialized = true;
        const router = { resolve: vi.fn((r) => r) };
        const to = { fullPath: "/dest" };
        const result = await guards.requireAuth({ name: "login" }, to, router, {});
        expect(result).toBeUndefined();
    });

    scopedIt("requireUnauth redirects when logged in", async () => {
        userStore.loggedIn = true;
        userStore.initialized = true;
        const router = { resolve: vi.fn((r) => r) };
        const result = await guards.requireUnauth({ name: "home" }, router, {});
        expect(result).toEqual({ name: "home" });
    });

    scopedIt("requireInitialized waits for user", async () => {
        await guards.requireInitialized(null, {});
        expect(fetchCurrentUser).toHaveBeenCalled();
    });

    scopedIt("requireGroups allows matching group", async () => {
        userStore.loggedInUser = { groups: ["admin"] };
        const router = { resolve: vi.fn((r) => r) };
        const toast = { add: vi.fn() };
        const instance = { config: { globalProperties: { $toast: toast } } };
        const to = { fullPath: "/path" };
        const result = await guards.requireGroups(instance, {}, ["admin"], { name: "denied" }, to, router, {});
        expect(result).toBe(true);
        expect(toast.add).not.toHaveBeenCalled();
    });

    scopedIt("requireModelInfo resolves when action allowed", async () => {
        fetchWorkflowTransition.mockResolvedValue([{ name: "other" }]);
        fetchModelInfo.mockResolvedValue({ actions: [{ name: "list" }] });
        getConfig.mockResolvedValue({ routerActions: ["list"] });
        const router = { resolve: vi.fn((r) => r) };
        const toast = { add: vi.fn() };
        const instance = { config: { globalProperties: { $toast: toast } } };
        const to = { params: { app: "a", model: "b", action: "list" }, fullPath: "/a/b/list" };
        const result = await guards.requireModelInfo(instance, { name: "nf" }, to, router, {});
        expect(result).toBe(true);
        expect(toast.add).not.toHaveBeenCalled();
    });

    scopedIt("requireModelInfo redirects on missing model", async () => {
        fetchWorkflowTransition.mockResolvedValue([]);
        fetchModelInfo.mockRejectedValue(new ModelInfoError("no"));
        const router = { resolve: vi.fn((r) => r) };
        const toast = { add: vi.fn() };
        const instance = { config: { globalProperties: { $toast: toast } } };
        const to = { params: { app: "a", model: "b", action: "c" }, fullPath: "/a/b/c" };
        const result = await guards.requireModelInfo(instance, { name: "nf" }, to, router, {});
        expect(toast.add).toHaveBeenCalled();
        expect(result).toEqual({ name: "nf" });
    });
});
