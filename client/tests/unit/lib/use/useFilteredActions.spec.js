import { scopedIt } from "@tests/unit/utils.js";
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

vi.mock("@vueda/use/useIsActive.js", () => ({
    useIsActive: vi.fn(),
}));

describe("lib/use/useFilteredActions.js", () => {
    let useModelConfig, storeUser, useProxyLoadingError, isActive;
    let modelConfig, userStore, mockedModelConfig, useIsActive;

    beforeEach(async () => {
        useIsActive = (await import("@vueda/use/useIsActive")).useIsActive;
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
        isActive = ref(false);
        useIsActive.mockReturnValue(isActive);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const activate = async () => {
        isActive.value = true;
        await flushPromises();
    };

    scopedIt("creates model config if none provided", async () => {
        useFilteredActions({ app: "foo", model: "bar" });
        expect(useModelConfig).not.toHaveBeenCalled();
        await activate();
        expect(useModelConfig).toHaveBeenCalledWith("foo", "bar", null);
    });
    scopedIt("uses provided modelConfigInstance", async () => {
        useFilteredActions({ modelConfigInstance: modelConfig });
        expect(useModelConfig).not.toHaveBeenCalled();
        await activate();
        expect(useModelConfig).not.toHaveBeenCalled();
    });
    scopedIt("returns flat array of actions if config.actions is an array", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = ["create", "update", "delete"];
        await flushPromises();
        expect(state.actions).toEqual([]);

        await activate();
        expect(state.actions).toEqual(["create", "update", "delete"]);
    });
    scopedIt("filters object-based actions based on user groups", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = {
            create: ["admins"],
            update: ["editors"],
            delete: ["managers"],
            audit: true,
        };
        await flushPromises();
        expect(state.actions).toEqual([]);

        await activate();
        expect(state.actions).toEqual(["create", "update", "audit"]);
    });
    scopedIt("returns empty actions if config.actions is invalid", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = null;
        await flushPromises();
        expect(state.actions).toEqual([]);

        mockedModelConfig.config.actions = "not-valid";
        await flushPromises();
        expect(state.actions).toEqual([]);
    });
    scopedIt("reflects loading, error, and error clearing", async () => {
        const clearError = vi.fn();
        useProxyLoadingError.mockReturnValue({
            loading: ref(true),
            error: ref(new Error("boom")),
            errored: ref(true),
            clearError,
        });
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        expect(state.loading).toBeUndefined();
        expect(state.errored).toBe(false);
        expect(state.error).toBeNull();
        expect(state.clearError).toEqual(expect.any(Function));
        expect(state.clearError).not.toBe(clearError); // the default placeholder

        await activate();
        expect(state.loading).toBe(true);
        expect(state.errored).toBe(true);
        expect(state.error).toBeInstanceOf(Error);
        expect(state.clearError).toBe(clearError);
    });
    scopedIt("updates actions when config.actions changes to flat array", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = {
            create: ["admins"],
            audit: true,
        };
        await flushPromises();
        expect(state.actions).toEqual([]);

        await activate();
        expect(state.actions).toEqual(["create", "audit"]);

        mockedModelConfig.config.actions = ["a", "b", "c"];
        await flushPromises();
        expect(state.actions).toEqual(["a", "b", "c"]);
    });
    scopedIt("clears actions when config.actions becomes invalid", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = ["valid"];
        await flushPromises();
        expect(state.actions).toEqual([]);

        await activate();
        expect(state.actions).toEqual(["valid"]);

        mockedModelConfig.config.actions = null;
        await flushPromises();
        expect(state.actions).toEqual([]);
    });
    scopedIt("updates filtered actions when user groups change", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = {
            create: ["admins"],
            update: ["managers"],
            audit: true,
        };
        await flushPromises();
        expect(state.actions).toEqual([]);

        await activate();
        expect(state.actions).toEqual(["create", "audit"]);

        // now change user groups to ["managers"]
        userStore.loggedInUser.groups = ["managers"];
        await flushPromises();
        expect(state.actions).toEqual(["update", "audit"]);
    });
    scopedIt("reacts to deep change in group-restricted actions", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        // start with only one action allowed
        mockedModelConfig.config.actions = {
            onlyForAdmins: ["admins"],
        };
        await flushPromises();
        expect(state.actions).toEqual([]);

        await activate();
        expect(state.actions).toEqual(["onlyForAdmins"]);

        // update actions object reactively without replacing it
        mockedModelConfig.config.actions.newAction = ["editors"];
        await flushPromises();
        expect(state.actions).toEqual(["onlyForAdmins", "newAction"]);
    });
    scopedIt("uses empty array when groups is falsy", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = {
            create: ["admins"],
            update: ["managers"],
            audit: true,
        };
        await flushPromises();
        expect(state.actions).toEqual([]);

        await activate();
        expect(state.actions).toEqual(["create", "audit"]);

        userStore.loggedInUser.groups = null;
        await flushPromises();
        expect(state.actions).toEqual(["audit"]);
    });
    scopedIt("uses empty array when loggedInUser is null", async () => {
        const state = useFilteredActions({ modelConfigInstance: modelConfig });
        mockedModelConfig.config.actions = {
            adminOnly: ["admins"],
            public: true,
        };
        await flushPromises();
        expect(state.actions).toEqual([]);

        await activate();
        expect(state.actions).toEqual(["adminOnly", "public"]);

        userStore.loggedInUser = null;
        await flushPromises();
        expect(state.actions).toEqual(["public"]);
    });
});
