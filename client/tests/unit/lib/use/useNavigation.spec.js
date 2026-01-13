import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { reactive, ref } from "vue";

const fetchModelInfo = vi.fn();
const getConfig = vi.fn();

const modelInfoStore = { fetchModelInfo };
const modelConfigStore = { getConfig };

vi.mock("@vueda/stores/storeModelInfo.js", () => ({
    storeModelInfo: () => modelInfoStore,
}));

vi.mock("@vueda/stores/storeModelConfig.js", () => ({
    storeModelConfig: () => modelConfigStore,
}));

const loadingError = {
    loading: ref(false),
    error: ref(null),
    errored: ref(false),
};
vi.mock("@arrai-innovations/reactive-helpers", () => ({
    useLoadingError: () => loadingError,
}));

describe("lib/use/useNavigation.js", () => {
    let useNavigation;

    beforeEach(async () => {
        useNavigation = (await import("@vueda/use/useNavigation.js")).useNavigation;
        fetchModelInfo.mockReset();
        getConfig.mockReset();
    });

    scopedIt("builds navigation from config and custom routes", async () => {
        fetchModelInfo.mockResolvedValue({});
        getConfig.mockResolvedValue({});

        const userConfig = reactive({
            apps: [
                {
                    name: "Blog",
                    link: "/blog",
                    models: [{ name: "Post", link: "/blog/post", actions: ["list", "create"] }],
                },
            ],
            customRoutes: [{ name: "About", link: "/about" }],
        });

        const state = useNavigation(userConfig);
        await flushPromises();

        expect(fetchModelInfo).toHaveBeenCalledWith({ app: "Blog", model: "Post" });
        expect(getConfig).toHaveBeenCalledWith({ app: "Blog", model: "Post" });
        expect(state.navigation).toEqual([
            {
                name: "Blog",
                link: "/blog",
                children: [
                    {
                        name: "Post",
                        link: "/blog/post",
                        actions: [
                            { name: "list", link: "/blog/post/list" },
                            { name: "create", link: "/blog/post/create" },
                        ],
                    },
                ],
            },
            { name: "About", link: "/about" },
        ]);
        expect(state.loading).toBe(false);
        expect(state.error).toBe(null);
    });

    scopedIt("skips models when fetching data fails", async () => {
        fetchModelInfo.mockResolvedValueOnce({});
        getConfig.mockResolvedValueOnce({});
        fetchModelInfo.mockRejectedValueOnce(new Error("fail"));
        getConfig.mockResolvedValueOnce({});

        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const userConfig = reactive({
            apps: [
                {
                    name: "App",
                    models: [
                        { name: "Good", link: "/good", actions: ["a"] },
                        { name: "Bad", link: "/bad", actions: ["b"] },
                    ],
                },
            ],
            customRoutes: [],
        });

        const state = useNavigation(userConfig);
        await flushPromises();

        expect(state.navigation).toEqual([
            {
                name: "App",
                link: null,
                children: [
                    {
                        name: "Good",
                        link: "/good",
                        actions: [{ name: "a", link: "/good/a" }],
                    },
                ],
            },
        ]);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    scopedIt("updates navigation when customRoutes change", async () => {
        fetchModelInfo.mockResolvedValue({});
        getConfig.mockResolvedValue({});

        const userConfig = reactive({
            apps: [
                {
                    name: "Blog",
                    link: "/blog",
                    models: [{ name: "Post", link: "/blog/post", actions: ["list"] }],
                },
            ],
            customRoutes: [],
        });

        const state = useNavigation(userConfig);
        await flushPromises();

        expect(state.navigation.length).toBe(1); // only app

        userConfig.customRoutes.push({ name: "Extra", link: "/extra" });
        await flushPromises();

        expect(state.navigation.length).toBe(2);
        expect(state.navigation[1]).toEqual({ name: "Extra", link: "/extra" });
    });
});
