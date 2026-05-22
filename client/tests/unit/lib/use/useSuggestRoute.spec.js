import { mockLifecycle, scopedIt } from "@tests/unit/utils.js";

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
    let useSuggestRoute, useSuggestRoutes, scope, vue;

    beforeEach(async () => {
        vue = await import("vue"); // mocked
        scope = vue.effectScope();
        ({ useSuggestRoute, useSuggestRoutes } = await import("@vueda/use/useSuggestRoute.js"));
        vi.clearAllMocks();
        mockedLifecycle.clearActivated();
    });

    afterEach(() => {
        scope.stop();
    });

    scopedIt("returns the best matching route when activated", async () => {
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
    scopedIt("resolves best match from nested route children", async () => {
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

    describe("useSuggestRoutes", () => {
        const routes = [
            { path: "/blog/article/:pk/edit" },
            { path: "/blog/article/:pk/view" },
            { path: "/users", children: [{ path: "/users/:pk/view" }] },
            { path: "/admin/dashboard" },
        ];

        scopedIt("returns empty array before activated", () => {
            mockedUseRouter.mockReturnValue({
                currentRoute: { value: { path: "/blog/article/42/edit" } },
                options: { routes },
            });
            let result;
            scope.run(() => {
                result = useSuggestRoutes();
            });
            expect(result.value).toEqual([]);
        });

        scopedIt("returns sorted matches with scores after activated", () => {
            mockedUseRouter.mockReturnValue({
                currentRoute: { value: { path: "/blog/article/42/edit" } },
                options: { routes },
            });
            let result;
            scope.run(() => {
                result = useSuggestRoutes();
            });
            mockedLifecycle.runActivatedHooks();

            expect(result.value.length).toBeGreaterThan(0);
            // First result should be the closest match
            expect(result.value[0].matchedPath).toBe("/blog/article/:pk/edit");
            expect(result.value[0].score).toBeGreaterThan(0);
            // Results must be sorted descending by score
            for (let i = 1; i < result.value.length; i++) {
                expect(result.value[i - 1].score).toBeGreaterThanOrEqual(result.value[i].score);
            }
        });

        scopedIt("each result has route, score, and matchedPath", () => {
            mockedUseRouter.mockReturnValue({
                currentRoute: { value: { path: "/blog/article/42/edit" } },
                options: { routes },
            });
            let result;
            scope.run(() => {
                result = useSuggestRoutes();
            });
            mockedLifecycle.runActivatedHooks();

            result.value.forEach((entry) => {
                expect(entry).toHaveProperty("route");
                expect(entry).toHaveProperty("score");
                expect(entry).toHaveProperty("matchedPath");
                expect(typeof entry.score).toBe("number");
            });
        });

        scopedIt("respects the limit option", () => {
            mockedUseRouter.mockReturnValue({
                currentRoute: { value: { path: "/blog/article/42/edit" } },
                options: { routes },
            });
            let result;
            scope.run(() => {
                result = useSuggestRoutes({ limit: 1 });
            });
            mockedLifecycle.runActivatedHooks();

            expect(result.value.length).toBeLessThanOrEqual(1);
        });

        scopedIt("filters out zero-score results", () => {
            mockedUseRouter.mockReturnValue({
                currentRoute: { value: { path: "/zzz/qqq/xxx" } },
                options: {
                    routes: [{ path: "/admin/dashboard" }],
                },
            });
            let result;
            scope.run(() => {
                result = useSuggestRoutes();
            });
            mockedLifecycle.runActivatedHooks();

            result.value.forEach((entry) => {
                expect(entry.score).toBeGreaterThan(0);
            });
        });

        scopedIt("route contains params extracted from current path", () => {
            mockedUseRouter.mockReturnValue({
                currentRoute: { value: { path: "/blog/article/99/edit" } },
                options: { routes },
            });
            let result;
            scope.run(() => {
                result = useSuggestRoutes({ limit: 1 });
            });
            mockedLifecycle.runActivatedHooks();

            expect(result.value[0].route).toEqual({
                name: "/blog/article/:pk/edit",
                params: { pk: "99" },
            });
        });
    });
});
