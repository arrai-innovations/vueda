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
    setLoading: vi.fn(),
    clearLoading: vi.fn(),
};

vi.mock("@arrai-innovations/reactive-helpers", async () => {
    const actual = await vi.importActual("@arrai-innovations/reactive-helpers");
    return {
        ...actual,
        useLoadingError: () => mockLoadingError,
        useProxyLoadingError: () => mockLoadingError,
    };
});

const isActive = ref(true);
vi.mock("@vueda/use/useIsActive", () => ({
    useIsActive: vi.fn(() => isActive),
}));

vi.mock("@vueda/utils/actionMap.js", () => ({
    getActionName: (view) => view,
}));

describe("lib/use/useModelConfig.js", () => {
    let useModelConfig;

    beforeEach(async () => {
        useModelConfig = (await import("@vueda/use/useModelConfig.js")).useModelConfig;
        mockStore.builtConfigs = reactive({});
    });

    afterEach(async () => {
        vi.clearAllMocks();
        isActive.value = true;
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
