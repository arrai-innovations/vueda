import flushPromises from "flush-promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("@vueda/use/useIsActive.js", () => ({
    useIsActive: vi.fn(() => ref(true)),
}));

describe("useModelChoices", () => {
    let useModelChoices, scope;

    beforeEach(async () => {
        scope = effectScope();
        useModelChoices = (await import("@vueda/use/useModelChoices.js")).useModelChoices;
        vi.clearAllMocks();
        storeMock.choices = reactive({});
        storeMock.filterChoices = reactive({});
    });

    afterEach(() => {
        scope.stop();
    });

    it("fetches normal choices on mount", async () => {
        const app = ref("blog");
        const model = ref("article");
        const field = ref("status");
        const intendToFetch = ref(true);

        const key = "blog.article";
        storeMock.choices[key] = { status: ["draft", "published"] };
        storeMock.fetchChoices.mockResolvedValue();

        let result;
        scope.run(() => {
            result = useModelChoices(app, model, field, undefined, intendToFetch);
        });

        await flushPromises();

        expect(storeMock.fetchChoices).toHaveBeenCalledWith("blog", "article", "status");
        expect(result.choices.status).toEqual(["draft", "published"]);
    });

    it("fetches filter choices when isFilter is true", async () => {
        const app = ref("blog");
        const model = ref("article");
        const field = ref("status");
        const intendToFetch = ref(true);
        const isFilter = ref(true);

        const key = "blog.article";
        storeMock.filterChoices[key] = { status: ["open", "closed"] };
        storeMock.fetchFilterChoices.mockResolvedValue();

        let result;
        scope.run(() => {
            result = useModelChoices(app, model, field, undefined, intendToFetch, isFilter);
        });

        await flushPromises();

        expect(storeMock.fetchFilterChoices).toHaveBeenCalledWith("blog", "article", "status");
        expect(result.choices.status).toEqual(["open", "closed"]);
    });

    it("does not fetch when inactive", async () => {
        const app = ref("a");
        const model = ref("b");
        const field = ref("x");
        const isActive = ref(false);
        const intendToFetch = ref(true);

        scope.run(() => {
            useModelChoices(app, model, field, isActive, intendToFetch);
        });

        await flushPromises();

        expect(storeMock.fetchChoices).not.toHaveBeenCalled();
    });

    it("does not fetch when intendToFetch is false", async () => {
        const app = ref("a");
        const model = ref("b");
        const field = ref("x");
        const intendToFetch = ref(false);

        scope.run(() => {
            useModelChoices(app, model, field, undefined, intendToFetch);
        });

        await flushPromises();

        expect(storeMock.fetchChoices).not.toHaveBeenCalled();
    });

    it("avoids redundant fetches with identical inputs", async () => {
        const app = ref("app");
        const model = ref("model");
        const field = ref("field");
        const intendToFetch = ref(true);

        storeMock.fetchChoices.mockResolvedValue();

        scope.run(() => {
            useModelChoices(app, model, field, undefined, intendToFetch);
        });

        await flushPromises();

        expect(storeMock.fetchChoices).toHaveBeenCalledTimes(1);

        app.value = "app"; // same value
        model.value = "model";
        field.value = "field";

        await flushPromises();

        expect(storeMock.fetchChoices).toHaveBeenCalledTimes(1); // still 1
    });

    it("handles an error from fetchChoices", async () => {
        const app = ref("blog");
        const model = ref("post");
        const field = ref("status");
        const intendToFetch = ref(true);
        const error = new Error("choices failed");

        storeMock.fetchChoices.mockRejectedValue(error);

        scope.run(() => {
            useModelChoices(app, model, field, undefined, intendToFetch);
        });

        await flushPromises();

        expect(mockLoadingError.setError).toHaveBeenCalledWith(error);
        expect(mockLoadingError.clearLoading).toHaveBeenCalled();
    });
});
