import { mockLifecycle } from "@tests/unit/utils.js";

const mockedLifecycle = mockLifecycle(vi);

vi.mock("vue", async () => {
    const actual = await vi.importActual("vue");
    return {
        ...actual,
        onActivated: mockedLifecycle.mockedOnActivated,
    };
});

const mockedUseRouter = vi.fn();

vi.mock("vue-router", async () => {
    return {
        useRouter: mockedUseRouter,
    };
});

describe("lib/use/useSuggestRoute.js", () => {
    let useSuggestRoute, scope, vue;

    beforeEach(async () => {
        vue = await import("vue"); // mocked
        scope = vue.effectScope();
        useSuggestRoute = (await import("@vueda/use/useSuggestRoute.js")).useSuggestRoute;
        vi.clearAllMocks();
        mockedLifecycle.clearActivated();
    });

    afterEach(() => {
        scope.stop();
    });

    it("returns the best matching route when activated", async () => {
        mockedUseRouter.mockImplementation(() => ({
            currentRoute: { value: { path: "/blog/article/42/edit" } },
            options: {
                routes: [
                    { path: "/blog/article/:pk/edit" },
                    { path: "/users", children: [{ path: "/users/:pk/view" }] },
                    { path: "/admin/dashboard" },
                ],
            },
        }));
        let result;
        scope.run(() => {
            result = useSuggestRoute();
        });

        expect(result.value).toBe(null); // not run yet

        mockedLifecycle.runActivatedHooks(); // triggers the hook

        expect(result.value).toEqual({
            name: "/blog/article/:pk/edit",
            params: { pk: "42" },
        });
    });
    it("resolves best match from nested route children", async () => {
        mockedUseRouter.mockImplementation(() => ({
            currentRoute: { value: { path: "/users/123/view" } },
            options: {
                routes: [
                    { path: "/blog/article/:pk/edit" },
                    { path: "/users", children: [{ path: "/users/:pk/view" }] },
                    { path: "/admin/dashboard" },
                ],
            },
        }));
        let result;
        scope.run(() => {
            result = useSuggestRoute();
        });

        expect(result.value).toBe(null);

        mockedLifecycle.runActivatedHooks();

        expect(result.value).toEqual({
            name: "/users/:pk/view",
            params: { pk: "123" },
        });
    });
});
