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

const toastMock = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    message: vi.fn(),
};
vi.mock("@arrai-innovations/vue-sonner", () => ({ toast: toastMock }));

describe("lib/router/guards.js", () => {
    let guards;
    let warnSpy;
    let AuthScopeInvalidatedError;

    beforeEach(async () => {
        vi.resetModules();
        fetchCurrentUser.mockReset();
        fetchModelInfo.mockReset();
        getConfig.mockReset();
        fetchWorkflowTransition.mockReset();
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        userStore = {
            initialized: false,
            loggedIn: false,
            loggedInUser: {},
            recentlyLoggedIn: false,
            fetchCurrentUser,
        };
        modelInfoStore = { fetchModelInfo, actions: [] };
        modelConfigStore = { getConfig };
        workflowStore = { fetchWorkflowTransition };

        guards = await import("@vueda/router/guards.js");
        ({ AuthScopeInvalidatedError } = await import("@vueda/utils/errors.js"));
    });
    afterEach(() => {
        warnSpy?.mockRestore();
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
        const instance = {};
        const to = { fullPath: "/path" };
        const result = await guards.requireGroups(instance, {}, ["admin"], { name: "denied" }, to, router, {});
        expect(result).toBe(true);
        expect(toastMock.error).not.toHaveBeenCalled();
    });

    scopedIt("requireGroups denies unauthorized user", async () => {
        userStore.loggedInUser = { groups: ["user"] };
        const router = { resolve: vi.fn((r) => r) };
        const instance = {};
        const to = { fullPath: "/path" };
        const toastArgs = { summary: "Denied", detail: "Forbidden", severity: "error" };
        const result = await guards.requireGroups(instance, toastArgs, ["admin"], { name: "denied" }, to, router, {});
        expect(toastMock.error).toHaveBeenCalledWith("Denied", {
            description: `Forbidden /path`,
        });
        expect(result).toEqual({ name: "denied" });
    });

    scopedIt("requireModelInfo resolves when action allowed", async () => {
        fetchWorkflowTransition.mockResolvedValue([{ code: "other", name: "Other" }]);
        fetchModelInfo.mockResolvedValue({ actions: [{ name: "list" }] });
        getConfig.mockResolvedValue({ routeActions: ["list"] });
        const router = { resolve: vi.fn((r) => r) };
        const instance = {};
        const to = { params: { app: "a", model: "b", action: "list" }, fullPath: "/a/b/list" };
        const result = await guards.requireModelInfo(instance, { name: "nf" }, to, router, {});
        expect(result).toBe(true);
        expect(toastMock.error).not.toHaveBeenCalled();
    });

    scopedIt("requireModelInfo throws when a workflow transition has no code", async () => {
        fetchWorkflowTransition.mockResolvedValue([{ name: "MissingCodeOnly" }]);
        fetchModelInfo.mockResolvedValue({ actions: [{ name: "list" }] });
        getConfig.mockResolvedValue({});
        const router = { resolve: vi.fn((r) => r) };
        const instance = {};
        const to = { params: { app: "a", model: "b", action: "list" }, fullPath: "/a/b/list" };

        await expect(guards.requireModelInfo(instance, { name: "nf" }, to, router, {})).rejects.toThrow(
            "requireModelInfo: workflow transition is missing a string code",
        );
        expect(toastMock.error).not.toHaveBeenCalled();
    });

    scopedIt("requireModelInfo redirects on missing model", async () => {
        fetchWorkflowTransition.mockResolvedValue([]);
        fetchModelInfo.mockRejectedValue(new ModelInfoError("no"));
        const router = { resolve: vi.fn((r) => r) };
        const instance = {};
        const to = { params: { app: "a", model: "b", action: "c" }, fullPath: "/a/b/c" };
        const result = await guards.requireModelInfo(instance, { name: "nf" }, to, router, {});
        expect(toastMock.error).toHaveBeenCalledWith("Model Not Found");
        expect(result).toEqual({ name: "nf" });
    });

    scopedIt("requireModelInfo cancels the navigation when the authenticated user changed", async () => {
        fetchWorkflowTransition.mockResolvedValue([]);
        fetchModelInfo.mockRejectedValue(new AuthScopeInvalidatedError("storeModelInfo.fetchModelInfo", "a.b"));
        const router = { resolve: vi.fn((r) => r) };
        const instance = {};
        const to = { params: { app: "a", model: "b", action: "list" }, fullPath: "/a/b/list" };

        const result = await guards.requireModelInfo(instance, { name: "nf" }, to, router, {});

        // `false` is the only return Vue Router reads as a refusal; see the navigation this produces
        // in tests/unit/lib/router/identityRouteRecheck.spec.js
        expect(result).toBe(false);
        expect(toastMock.error).not.toHaveBeenCalled();
        expect(router.resolve).not.toHaveBeenCalled();
    });

    scopedIt("requireModelInfo redirects when action not found", async () => {
        fetchWorkflowTransition.mockResolvedValue([]);
        fetchModelInfo.mockResolvedValue({ actions: [{ name: "list" }] });
        getConfig.mockResolvedValue({ routeActions: ["list"] });
        const router = { resolve: vi.fn((r) => r) };
        const instance = {};
        const to = { params: { app: "a", model: "b", action: "edit" }, fullPath: "/a/b/edit" };
        const result = await guards.requireModelInfo(instance, { name: "nf" }, to, router, {});
        expect(toastMock.error).toHaveBeenCalledWith("Action Not Found");
        expect(result).toEqual({ name: "nf" });
    });

    scopedIt("requireRecentAuth fetches status when unknown and allows access", async () => {
        const router = { resolve: vi.fn((r) => r) };
        const to = { fullPath: "/secure" };
        userStore.recentlyLoggedIn = undefined;
        fetchCurrentUser.mockImplementation(async () => {
            userStore.recentlyLoggedIn = true;
        });
        const result = await guards.requireRecentAuth({ name: "reauth" }, to, router, {});
        expect(fetchCurrentUser).toHaveBeenCalled();
        expect(result).toBeUndefined();
    });

    scopedIt("requireRecentAuth skips fetch and redirects when not recent", async () => {
        const router = { resolve: vi.fn((route) => ({ ...route, query: { from: "existing" } })) };
        const to = { fullPath: "/secure" };
        userStore.recentlyLoggedIn = false;
        const result = await guards.requireRecentAuth({ name: "reauth" }, to, router, {});
        expect(fetchCurrentUser).not.toHaveBeenCalled();
        expect(result).toEqual({ name: "reauth", query: { from: "existing", redirect: "/secure" } });
    });

    scopedIt("requireRecentAuth redirects after refreshing stale session", async () => {
        const router = { resolve: vi.fn((route) => ({ ...route, query: { next: "" } })) };
        const to = { fullPath: "/secure" };
        userStore.recentlyLoggedIn = undefined;
        fetchCurrentUser.mockImplementation(async () => {
            userStore.recentlyLoggedIn = false;
        });
        const result = await guards.requireRecentAuth({ name: "reauth" }, to, router, {});
        expect(fetchCurrentUser).toHaveBeenCalled();
        expect(result).toEqual({ name: "reauth", query: { next: "", redirect: "/secure" } });
    });
});
