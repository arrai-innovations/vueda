import { scopedIt } from "@tests/unit/utils.js";
import { getAppModelDotName, getAppModelViewDotName } from "@vueda/utils/case.js";
import flushPromises from "flush-promises";
import { reactive, ref } from "vue";

const mockedGetConfig = vi.fn();
const mockStore = reactive({
    builtConfigs: reactive({}),
    getConfig: mockedGetConfig,
});

vi.mock("@vueda/stores/storeModelConfig.js", () => ({
    storeModelConfig: () => mockStore,
}));

const mockModelInfo = reactive({
    info: { fields: ["id"] },
    loading: ref(false),
    error: ref(null),
    errored: ref(false),
    clearError: vi.fn(),
});

vi.mock("@vueda/use/useModelInfo.js", () => ({
    useModelInfo: vi.fn(() => mockModelInfo),
}));

const mockLoadingError = {
    loading: ref(false),
    error: ref(null),
    errored: ref(false),
    clearError: vi.fn(),
    setError: vi.fn(),
    setLoading: vi.fn(() => {
        mockLoadingError.loading.value = true;
    }),
    clearLoading: vi.fn(() => {
        mockLoadingError.loading.value = false;
    }),
};

vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return {
        ...actual,
        useLoadingError: () => mockLoadingError,
        useProxyLoadingError: () => mockLoadingError,
    };
});

const userStoreMock = reactive({ identityGeneration: 0 });
vi.mock("@vueda/stores/storeUser.js", () => ({
    storeUser: vi.fn(() => userStoreMock),
}));

const isActive = ref(true);
vi.mock("@vueda/use/useIsActive", () => ({
    useIsActive: vi.fn(() => isActive),
}));

vi.mock("@vueda/utils/actionMap.js", () => ({
    getActionName: (view) => view,
}));

describe("lib/use/useModelConfig.js", () => {
    let useModelConfig, errorsJs;

    beforeEach(async () => {
        useModelConfig = (await import("@vueda/use/useModelConfig.js")).useModelConfig;
        // imported here rather than at the top, because a static import pulls in the mocked
        // reactive-helpers module before the mock factory's variables exist
        errorsJs = await import("@vueda/utils/errors.js");
        mockStore.builtConfigs = reactive({});
    });

    afterEach(async () => {
        vi.clearAllMocks();
        mockLoadingError.loading.value = false;
        isActive.value = true;
        userStoreMock.identityGeneration = 0;
    });

    scopedIt("ignores an obsolete config completing after the destination config", async () => {
        const app = ref("blog");
        const model = ref("article");
        let resolveFirst;
        mockStore.getConfig.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveFirst = resolve;
                }),
        );
        mockStore.getConfig.mockImplementationOnce(async ({ app, model }) => {
            mockStore.builtConfigs[getAppModelDotName({ app, model })] = { fields: ["destination"] };
        });
        const result = useModelConfig(app, model);
        model.value = "comment";
        await flushPromises();
        expect(result.config.fields).toEqual(["destination"]);
        mockStore.builtConfigs[getAppModelDotName({ app: "blog", model: "article" })] = { fields: ["stale"] };
        resolveFirst();
        await flushPromises();
        expect(result.config.fields).toEqual(["destination"]);
    });

    describe("overlapping builds", () => {
        // holds each build pending until the test settles it, keyed by view
        function deferBuilds() {
            const builds = {};
            mockStore.getConfig.mockImplementation(
                (args) =>
                    new Promise((resolve, reject) => {
                        builds[args.view] = {
                            resolve: () => {
                                mockStore.builtConfigs[getAppModelViewDotName(args)] = { fields: [args.view] };
                                resolve();
                            },
                            reject,
                        };
                    }),
            );
            return builds;
        }

        async function startCreateThenList() {
            const builds = deferBuilds();
            const view = ref("create");
            const result = useModelConfig("blog", "article", view);
            await flushPromises();
            view.value = "list";
            await flushPromises();
            expect(mockStore.getConfig).toHaveBeenCalledTimes(2);
            expect(result.loading).toBe(true);
            return { builds, result };
        }

        scopedIt("keeps the current config when the superseded build settles last", async () => {
            const { builds, result } = await startCreateThenList();

            builds.list.resolve();
            await flushPromises();
            expect(result.config.fields).toEqual(["list"]);
            expect(result.loading).toBe(false);

            builds.create.resolve();
            await flushPromises();
            expect(result.config.fields).toEqual(["list"]);
            expect(result.loading).toBe(false);
        });

        scopedIt("stays loading when the superseded build settles first", async () => {
            const { builds, result } = await startCreateThenList();

            builds.create.resolve();
            await flushPromises();
            expect(result.config.fields).toBeUndefined();
            expect(result.loading).toBe(true);

            builds.list.resolve();
            await flushPromises();
            expect(result.config.fields).toEqual(["list"]);
            expect(result.loading).toBe(false);
        });

        scopedIt("ignores an error from a superseded build", async () => {
            const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            const { builds, result } = await startCreateThenList();

            builds.create.reject(new Error("superseded"));
            await flushPromises();
            expect(result.loading).toBe(true);

            builds.list.resolve();
            await flushPromises();
            expect(result.config.fields).toEqual(["list"]);
            expect(result.loading).toBe(false);
            expect(mockLoadingError.setError).not.toHaveBeenCalled();
            expect(logSpy).not.toHaveBeenCalled();
            logSpy.mockRestore();
        });

        scopedIt("stops loading when deactivated mid-build and rebuilds on reactivation", async () => {
            const builds = deferBuilds();
            const result = useModelConfig("blog", "article", "create");
            await flushPromises();
            expect(result.loading).toBe(true);

            isActive.value = false;
            await flushPromises();
            expect(result.loading).toBe(false);

            builds.create.resolve();
            await flushPromises();
            expect(result.config.fields).toBeUndefined();

            isActive.value = true;
            await flushPromises();
            expect(mockStore.getConfig).toHaveBeenCalledTimes(2);
            expect(result.loading).toBe(true);

            builds.create.resolve();
            await flushPromises();
            expect(result.config.fields).toEqual(["create"]);
            expect(result.loading).toBe(false);
        });

        scopedIt("stops loading when the model is cleared mid-build", async () => {
            const builds = deferBuilds();
            const model = ref("article");
            const result = useModelConfig("blog", model, "create");
            await flushPromises();
            expect(result.loading).toBe(true);

            model.value = "";
            await flushPromises();
            expect(result.loading).toBe(false);

            builds.create.resolve();
            await flushPromises();
            expect(result.config.fields).toBeUndefined();
            expect(result.loading).toBe(false);
        });
    });

    scopedIt("fetches config and sets it in returnObject", async () => {
        const app = ref("blog");
        const model = ref("article");
        const view = ref("create");

        mockStore.getConfig.mockImplementation(async ({ app, model, view }) => {
            const key = view ? getAppModelViewDotName({ app, model, view }) : getAppModelDotName({ app, model });
            mockStore.builtConfigs[key] = { fields: ["title"] }; // Or mock expected values
        });

        const result = useModelConfig(app, model, view);

        await flushPromises();
        expect(mockStore.getConfig).toHaveBeenCalledWith({ app: "blog", model: "article", view: "create" });
        await vi.waitUntil(() => !result.loading);
        expect(result.config.fields).toEqual(["title"]);
    });
    scopedIt("uses base config if view is not provided", async () => {
        const app = ref("blog");
        const model = ref("article");

        mockStore.getConfig.mockImplementation(async ({ app, model, view }) => {
            const key = view ? getAppModelViewDotName({ app, model, view }) : getAppModelDotName({ app, model });
            mockStore.builtConfigs[key] = { fields: ["id"] }; // Or mock expected values
        });

        const result = useModelConfig(app, model);

        await flushPromises();

        expect(mockStore.getConfig).toHaveBeenCalledWith({ app: "blog", model: "article", view: null });
        await vi.waitUntil(() => !result.loading);
        expect(result.config.fields).toEqual(["id"]);
    });
    scopedIt("does not fetch if isActive is false", async () => {
        isActive.value = false;

        const app = ref("app");
        const model = ref("model");

        const result = useModelConfig(app, model);

        await flushPromises();

        expect(mockStore.getConfig).not.toHaveBeenCalled();
        expect(result.loading).toBe(false);
    });
    scopedIt("sets error if getConfig throws", async () => {
        const error = new Error("failed");
        mockStore.getConfig.mockRejectedValue(error);

        const app = ref("blog");
        const model = ref("article");
        const view = ref("update");

        useModelConfig(app, model, view);
        expect(mockStore.getConfig).toHaveBeenCalled();
        await vi.waitFor(
            () => {
                expect(mockLoadingError.setError).toHaveBeenCalledWith(error);
            },
            { timeout: 1000, interval: 50 },
        );
    });
    scopedIt("throws if app or model is missing", () => {
        expect(() => useModelConfig(null, "model")).toThrow();
        expect(() => useModelConfig("app", undefined)).toThrow();
    });
    scopedIt("logs and sets error when getConfig fails", async () => {
        const app = ref("test");
        const model = ref("thing");
        const view = ref("detail");
        const err = new Error("server failed");

        mockStore.getConfig.mockRejectedValue(err);
        const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        useModelConfig(app, model, view);

        await flushPromises();

        expect(mockStore.getConfig).toHaveBeenCalled();
        await vi.waitFor(
            () => {
                expect(mockLoadingError.setError).toHaveBeenCalledWith(err);
            },
            { timeout: 1000, interval: 50 },
        );
        expect(logSpy).toHaveBeenCalledWith("useModelConfig: error fetching config", err);

        logSpy.mockRestore();
    });
    scopedIt("refetches config when view changes", async () => {
        const app = ref("blog");
        const model = ref("article");
        const view = ref("create");

        mockStore.getConfig.mockImplementation(async ({ app, model, view }) => {
            const key = view ? getAppModelViewDotName({ app, model, view }) : getAppModelDotName({ app, model });
            mockStore.builtConfigs[key] = { fields: [view === "create" ? "title" : "id"] };
        });

        const result = useModelConfig(app, model, view);

        await flushPromises();
        await vi.waitUntil(() => !result.loading);
        expect(result.config.fields).toEqual(["title"]);

        // Change the view
        view.value = "list";
        await flushPromises();
        await vi.waitUntil(() => !result.loading);
        expect(mockStore.getConfig).toHaveBeenCalledTimes(2);
        expect(result.config.fields).toEqual(["id"]);
    });
    scopedIt("rebuilds the config when the authenticated user changes", async () => {
        const app = ref("blog");
        const model = ref("article");

        mockStore.getConfig.mockImplementation(async ({ app, model, view }) => {
            const key = view ? getAppModelViewDotName({ app, model, view }) : getAppModelDotName({ app, model });
            mockStore.builtConfigs[key] = { fields: ["id"] };
        });

        const result = useModelConfig(app, model);
        await flushPromises();
        await vi.waitUntil(() => !result.loading);
        expect(mockStore.getConfig).toHaveBeenCalledTimes(1);

        // the store dropped its built configs at the identity boundary, so the composable has to rebuild
        userStoreMock.identityGeneration = 1;
        await flushPromises();
        await vi.waitUntil(() => !result.loading);

        expect(mockStore.getConfig).toHaveBeenCalledTimes(2);
    });
    scopedIt("rebuilds when the authenticated user changes while a build is in flight", async () => {
        const app = ref("blog");
        const model = ref("article");
        const key = getAppModelDotName({ app: "blog", model: "article" });

        let rejectFirstBuild;
        mockStore.getConfig
            .mockImplementationOnce(
                () =>
                    new Promise((resolve, reject) => {
                        rejectFirstBuild = reject;
                    }),
            )
            .mockImplementationOnce(async () => {
                mockStore.builtConfigs[key] = { fields: ["authorized for the new user"] };
            });

        const result = useModelConfig(app, model);
        await flushPromises();
        expect(mockStore.getConfig).toHaveBeenCalledTimes(1);

        // this composable has no loading guard, so the change of user starts the rebuild right away
        userStoreMock.identityGeneration = 1;
        await flushPromises();
        expect(mockStore.getConfig).toHaveBeenCalledTimes(2);

        // the store abandons the first build rather than caching one derived from the previous user's
        // permissions
        rejectFirstBuild(new errorsJs.AuthScopeInvalidatedError("storeModelConfig.getConfig", key));
        await flushPromises();

        expect(result.config.fields).toEqual(["authorized for the new user"]);
        expect(mockLoadingError.setError).not.toHaveBeenCalled();
    });
    scopedIt("includes modelInfo.info from useModelInfo", async () => {
        const app = ref("blog");
        const model = ref("article");

        mockModelInfo.info = { fields: ["name"] };

        const result = useModelConfig(app, model);

        expect(result.info.fields).toEqual(["name"]);
    });
    scopedIt("accepts string values for app, model, and view", async () => {
        mockStore.getConfig.mockImplementation(async ({ app, model, view }) => {
            const key = view ? getAppModelViewDotName({ app, model, view }) : getAppModelDotName({ app, model });
            mockStore.builtConfigs[key] = { fields: ["status"] };
        });

        const result = useModelConfig("app", "model", "custom");

        await flushPromises();
        await vi.waitUntil(() => !result.loading);
        expect(result.config.fields).toEqual(["status"]);
    });
});
