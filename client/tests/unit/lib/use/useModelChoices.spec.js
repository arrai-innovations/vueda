import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { effectScope, reactive, readonly, ref } from "vue";

const mockStoreFn = vi.fn(() => storeMock);

const storeMock = reactive({
    choices: reactive({}),
    filterChoices: reactive({}),
    fetchChoices: vi.fn(),
    fetchFilterChoices: vi.fn(),
    initializeChoice: vi.fn(),
});

vi.mock("@vueda/stores/storeModelChoices.js", async () => {
    const actual = await vi.importActual("@vueda/stores/storeModelChoices.js");
    return {
        ...actual,
        storeModelChoices: mockStoreFn,
    };
});

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
        useLoadingError: vi.fn(() => readonly(mockLoadingError)),
    };
});

const userStoreMock = reactive({ identityGeneration: 0 });
vi.mock("@vueda/stores/storeUser.js", () => ({
    storeUser: vi.fn(() => userStoreMock),
}));

vi.mock("@vueda/use/useIsActive.js", () => ({
    useIsActive: vi.fn(() => ref(true)),
}));

describe("lib/use/useModelChoices.js", () => {
    let useModelChoices, scope;

    beforeEach(async () => {
        scope = effectScope();
        useModelChoices = (await import("@vueda/use/useModelChoices.js")).useModelChoices;
        vi.clearAllMocks();
        storeMock.choices = reactive({});
        storeMock.filterChoices = reactive({});
        userStoreMock.identityGeneration = 0;
    });

    afterEach(() => {
        scope.stop();
    });

    scopedIt("fetches normal choices on mount", async () => {
        const app = ref("blog");
        const model = ref("article");
        const intendToFetch = ref(true);

        const fields = reactive({
            status: { app, model, intendToFetch },
        });

        const key = "blog.article";
        storeMock.choices[key] = { status: ["draft", "published"] };
        storeMock.fetchChoices.mockResolvedValue();

        let result;
        scope.run(() => {
            result = useModelChoices(fields);
        });

        await flushPromises();

        expect(storeMock.fetchChoices).toHaveBeenCalledWith("blog", "article", "status");
        expect(result.choices.status).toEqual(["draft", "published"]);
    });

    scopedIt("fetches filter choices when isFilter is true", async () => {
        const app = ref("blog");
        const model = ref("article");
        const intendToFetch = ref(true);
        const isFilter = ref(true);

        const fields = reactive({
            status: { app, model, intendToFetch, isFilter },
        });

        const key = "blog.article";
        storeMock.filterChoices[key] = { status: ["open", "closed"] };
        storeMock.fetchFilterChoices.mockResolvedValue();

        let result;
        scope.run(() => {
            result = useModelChoices(fields);
        });

        await flushPromises();

        expect(storeMock.fetchFilterChoices).toHaveBeenCalledWith("blog", "article", "status");
        expect(result.choices.status).toEqual(["open", "closed"]);
    });

    scopedIt("does not fetch when inactive", async () => {
        const app = ref("a");
        const model = ref("b");
        const intendToFetch = ref(true);
        const isActive = ref(false);

        const fields = reactive({
            x: { app, model, intendToFetch },
        });

        scope.run(() => {
            useModelChoices(fields, isActive);
        });

        await flushPromises();

        expect(storeMock.fetchChoices).not.toHaveBeenCalled();
    });

    scopedIt("does not fetch when intendToFetch is false", async () => {
        const app = ref("a");
        const model = ref("b");
        const intendToFetch = ref(false);

        const fields = reactive({
            x: { app, model, intendToFetch },
        });

        scope.run(() => {
            useModelChoices(fields);
        });

        await flushPromises();

        expect(storeMock.fetchChoices).not.toHaveBeenCalled();
    });

    scopedIt("avoids redundant fetches with identical inputs", async () => {
        const app = ref("app");
        const model = ref("model");
        const intendToFetch = ref(true);

        const fields = reactive({
            field: { app, model, intendToFetch },
        });

        storeMock.fetchChoices.mockResolvedValue();

        scope.run(() => {
            useModelChoices(fields);
        });

        await flushPromises();

        expect(storeMock.fetchChoices).toHaveBeenCalledTimes(1);

        app.value = "app"; // same value
        model.value = "model";
        // updating to same values should not trigger a new fetch

        await flushPromises();

        expect(storeMock.fetchChoices).toHaveBeenCalledTimes(1); // still 1
    });

    scopedIt("refetches choices when the authenticated user changes", async () => {
        const app = ref("blog");
        const model = ref("article");
        const intendToFetch = ref(true);

        const fields = reactive({
            status: { app, model, intendToFetch },
        });

        storeMock.choices["blog.article"] = { status: ["draft"] };
        storeMock.fetchChoices.mockResolvedValue();

        scope.run(() => {
            useModelChoices(fields);
        });

        await flushPromises();
        expect(storeMock.fetchChoices).toHaveBeenCalledTimes(1);

        // the store dropped its cache at the identity boundary, so the composable has to ask again
        userStoreMock.identityGeneration = 1;
        await flushPromises();

        expect(storeMock.fetchChoices).toHaveBeenCalledTimes(2);
    });

    scopedIt("handles an error from fetchChoices", async () => {
        const app = ref("blog");
        const model = ref("post");
        const intendToFetch = ref(true);

        const fields = reactive({
            status: { app, model, intendToFetch },
        });
        const error = new Error("choices failed");

        storeMock.fetchChoices.mockRejectedValue(error);

        scope.run(() => {
            useModelChoices(fields);
        });

        await flushPromises();

        expect(mockLoadingError.setError).toHaveBeenCalledWith(error);
        expect(mockLoadingError.clearLoading).toHaveBeenCalled();
    });
});
