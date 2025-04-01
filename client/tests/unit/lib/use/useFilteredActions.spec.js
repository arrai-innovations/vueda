import { useFilteredActions } from "@vueda/use/useFilteredActions.js";
import flushPromises from "flush-promises";
import { reactive, readonly, ref } from "vue";

vi.mock("@vueda/use/useModelConfig", () => ({
    useModelConfig: vi.fn(),
}));

vi.mock("@vueda/stores/storeUser.js", () => ({
    storeUser: vi.fn(),
}));

vi.mock("@arrai-innovations/reactive-helpers", () => ({
    useProxyLoadingError: vi.fn(),
}));

describe("lib/use/useFilteredActions.js", () => {
    let useModelConfig, storeUser, useProxyLoadingError;
    let modelConfig, userStore, mockedModelConfig;

    beforeEach(async () => {
        useModelConfig = (await import("@vueda/use/useModelConfig")).useModelConfig;
        storeUser = (await import("@vueda/stores/storeUser.js")).storeUser;
        useProxyLoadingError = (await import("@arrai-innovations/reactive-helpers")).useProxyLoadingError;

        mockedModelConfig = reactive({
            app: ref("foo"),
            model: ref("bar"),
            view: ref("detail"),
            config: ref({}),
            info: ref({}),
        });
        modelConfig = readonly(mockedModelConfig);

        userStore = reactive({
            loggedInUser: ref({
                groups: ["admins", "editors"],
            }),
        });

        useModelConfig.mockReturnValue(modelConfig);
        storeUser.mockReturnValue(userStore);
        useProxyLoadingError.mockReturnValue({
            loading: ref(false),
            error: ref(null),
            errored: ref(false),
            clearError: vi.fn(),
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });
    it("creates model config if none provided", () => {
        useFilteredActions({ app: "foo", model: "bar" });

        expect(useModelConfig).toHaveBeenCalledWith("foo", "bar", null);
    });
    it("uses provided modelConfigInstance", () => {
        useFilteredActions({ modelConfigInstance: modelConfig });

        expect(useModelConfig).not.toHaveBeenCalled();
    });
    it("returns flat array of actions if config.actions is an array", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = ["create", "update", "delete"];
        await flushPromises();

        expect(state.actions).toEqual(["create", "update", "delete"]);
    });
    it("filters object-based actions based on user groups", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = {
            create: ["admins"],
            update: ["editors"],
            delete: ["managers"],
            audit: true,
        };
        await flushPromises();

        expect(state.actions).toEqual(["create", "update", "audit"]);
    });
    it("returns empty actions if config.actions is invalid", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = null;
        await flushPromises();
        expect(state.actions).toEqual([]);

        mockedModelConfig.config.actions = "not-valid";
        await flushPromises();
        expect(state.actions).toEqual([]);
    });
    it("reflects loading, error, and error clearing", () => {
        const clearError = vi.fn();
        useProxyLoadingError.mockReturnValue({
            loading: ref(true),
            error: ref(new Error("boom")),
            errored: ref(true),
            clearError,
        });
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        expect(state.loading).toBe(true);
        expect(state.errored).toBe(true);
        expect(state.error).toBeInstanceOf(Error);
        expect(state.clearError).toBe(clearError);
    });
    it("updates actions when config.actions changes to flat array", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = {
            create: ["admins"],
            audit: true,
        };
        await flushPromises();
        expect(state.actions).toEqual(["create", "audit"]);

        mockedModelConfig.config.actions = ["a", "b", "c"];
        await flushPromises();
        expect(state.actions).toEqual(["a", "b", "c"]);
    });
    it("clears actions when config.actions becomes invalid", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = ["valid"];
        await flushPromises();
        expect(state.actions).toEqual(["valid"]);

        mockedModelConfig.config.actions = null;
        await flushPromises();
        expect(state.actions).toEqual([]);
    });
    it("updates filtered actions when user groups change", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = {
            create: ["admins"],
            update: ["managers"],
            audit: true,
        };
        await flushPromises();
        expect(state.actions).toEqual(["create", "audit"]);

        // now change user groups to ["managers"]
        userStore.loggedInUser.groups = ["managers"];
        await flushPromises();
        expect(state.actions).toEqual(["update", "audit"]);
    });
    it("reacts to deep change in group-restricted actions", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        // start with only one action allowed
        mockedModelConfig.config.actions = {
            onlyForAdmins: ["admins"],
        };
        await flushPromises();
        expect(state.actions).toEqual(["onlyForAdmins"]);

        // update actions object reactively without replacing it
        mockedModelConfig.config.actions.newAction = ["editors"];
        await flushPromises();
        expect(state.actions).toEqual(["onlyForAdmins", "newAction"]);
    });
    it("uses empty array when groups is falsy", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = {
            create: ["admins"],
            update: ["managers"],
            audit: true,
        };
        await flushPromises();
        expect(state.actions).toEqual(["create", "audit"]);

        userStore.loggedInUser.groups = null;
        await flushPromises();
        expect(state.actions).toEqual(["audit"]);
    });
    it("uses empty array when loggedInUser is null", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = {
            adminOnly: ["admins"],
            public: true,
        };
        await flushPromises();
        expect(state.actions).toEqual(["adminOnly", "public"]);

        userStore.loggedInUser = null;
        await flushPromises();
        expect(state.actions).toEqual(["public"]);
    });
});
