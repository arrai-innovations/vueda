import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";

const requireAuth = vi.fn();
const requireGroups = vi.fn();
const requireModelInfo = vi.fn();

vi.mock("@vueda/router/guards.js", () => ({
    requireAuth,
    requireGroups,
    requireModelInfo,
}));

describe("lib/router/makeCrud.js", () => {
    let makeCRUDRoutes;
    let storeUser;
    let pinia;
    const component = {};
    const vueApp = {};
    let router;
    const actionRedirect = { name: "not-found" };

    /**
     * The guard `makeCRUDRoutes` last registered with `router.beforeEach`.
     *
     * @returns {(to: object, from: object) => any} The registered guard.
     */
    const registeredGuard = () => router.beforeEach.mock.calls.at(-1)[0];

    beforeEach(async () => {
        vi.resetModules();
        requireAuth.mockReset();
        requireGroups.mockReset();
        requireModelInfo.mockReset();
        router = { beforeEach: vi.fn() };
        pinia = createPinia();
        setActivePinia(pinia);
        ({ makeCRUDRoutes } = await import("@vueda/router/makeCrud.js"));
        ({ storeUser } = await import("@vueda/stores/storeUser.js"));
    });

    scopedIt("builds routes with default options", () => {
        const [detail, list] = makeCRUDRoutes({ component, vueApp, router, pinia, actionRedirect });

        expect(detail).toEqual(
            expect.objectContaining({
                name: "actionrouter.detailview",
                path: "/:app/:model/:action/:pk",
                component,
                meta: { detail: true },
            }),
        );
        expect(list).toEqual(
            expect.objectContaining({
                name: "actionrouter.listview",
                path: "/:app/:model/:action/",
                component,
            }),
        );

        const to = { name: "actionrouter.detailview", params: { app: "a", model: "b", action: "c", pk: "1" } };
        const from = { name: undefined, params: {} };
        registeredGuard()(to, from);
        expect(requireModelInfo).toHaveBeenCalledWith(vueApp, actionRedirect, to, router, pinia);
    });

    scopedIt("adds prefix and guards when provided", async () => {
        const authRedirect = { name: "login" };
        const groups = ["admin"];
        const groupsRedirect = { name: "denied" };
        const actionRedirect = { name: "missing" };
        requireAuth.mockResolvedValue(undefined);
        requireModelInfo.mockResolvedValue(true);
        const [detail, list] = makeCRUDRoutes({
            component,
            authRedirect,
            groups,
            groupsRedirect,
            actionRedirect,
            pathPrefix: "pre",
            vueApp,
            router,
            pinia,
        });

        expect(detail.path).toBe("/pre/:app/:model/:action/:pk");
        expect(list.path).toBe("/pre/:app/:model/:action/");

        const to = { name: "actionrouter.listview", params: { app: "a", model: "b", action: "c" } };
        const from = { name: undefined, params: {} };
        await registeredGuard()(to, from);

        expect(requireAuth).toHaveBeenCalledWith(authRedirect, to, router, pinia);
        expect(requireModelInfo).toHaveBeenCalledWith(vueApp, actionRedirect, to, router, pinia);
        expect(requireGroups).toHaveBeenCalledWith(
            vueApp,
            {
                summary: "Permission Denied",
                detail: "You do not have permission to access",
                severity: "error",
            },
            groups,
            groupsRedirect,
            to,
            router,
            pinia,
        );
    });

    describe("Recheck when navigation stays inside one route record", () => {
        const to = (action, extra = {}) => ({
            name: "actionrouter.listview",
            params: { app: "blog", model: "post", action },
            ...extra,
        });

        beforeEach(() => {
            requireModelInfo.mockResolvedValue(true);
        });

        scopedIt("reruns the checks when the action changes inside the same record", async () => {
            makeCRUDRoutes({ component, vueApp, router, pinia, actionRedirect });

            await registeredGuard()(to("update"), to("list"));

            expect(requireModelInfo).toHaveBeenCalledWith(vueApp, actionRedirect, to("update"), router, pinia);
        });

        scopedIt("reruns the checks when the model changes inside the same record", async () => {
            makeCRUDRoutes({ component, vueApp, router, pinia, actionRedirect });
            const target = { name: "actionrouter.listview", params: { app: "blog", model: "comment", action: "list" } };

            await registeredGuard()(target, to("list"));

            expect(requireModelInfo).toHaveBeenCalledWith(vueApp, actionRedirect, target, router, pinia);
        });

        scopedIt("skips the checks when only the query string changes", async () => {
            makeCRUDRoutes({ component, vueApp, router, pinia, actionRedirect });
            const target = to("list", { query: { page: "2" } });

            const result = await registeredGuard()(target, to("list", { query: { page: "1" } }));

            expect(requireModelInfo).not.toHaveBeenCalled();
            expect(result).toBe(true);
        });

        scopedIt("skips the checks when only the primary key changes", async () => {
            makeCRUDRoutes({ component, vueApp, router, pinia, actionRedirect });
            const detailTo = (pk) => ({
                name: "actionrouter.detailview",
                params: { app: "blog", model: "post", action: "update", pk },
            });

            const result = await registeredGuard()(detailTo("2"), detailTo("1"));

            expect(requireModelInfo).not.toHaveBeenCalled();
            expect(result).toBe(true);
        });

        scopedIt("leaves a route it did not generate alone", async () => {
            makeCRUDRoutes({ component, vueApp, router, pinia, actionRedirect });
            const target = { name: "welcome", params: {} };

            const result = await registeredGuard()(target, to("list"));

            expect(requireModelInfo).not.toHaveBeenCalled();
            expect(result).toBe(true);
        });

        scopedIt(
            "reruns the checks on a move from the list record to the detail record, even with the app, model, and action unchanged",
            async () => {
                makeCRUDRoutes({ component, vueApp, router, pinia, actionRedirect });
                const detailTo = {
                    name: "actionrouter.detailview",
                    params: { app: "blog", model: "post", action: "update", pk: "2" },
                };

                await registeredGuard()(detailTo, to("update"));

                expect(requireModelInfo).toHaveBeenCalledWith(vueApp, actionRedirect, detailTo, router, pinia);
            },
        );

        scopedIt("redirects when the check for the new target denies it", async () => {
            requireModelInfo.mockResolvedValue(actionRedirect);
            makeCRUDRoutes({ component, vueApp, router, pinia, actionRedirect });

            const result = await registeredGuard()(to("delete"), to("list"));

            expect(result).toBe(actionRedirect);
        });
    });

    scopedIt("list route props splits pk query", () => {
        const [, list] = makeCRUDRoutes({ component, vueApp, router, pinia, actionRedirect });

        const props = list.props({
            params: { app: "app", model: "model", action: "list" },
            query: { pk: "1,2,3" },
        });

        expect(props).toEqual({
            app: "app",
            model: "model",
            action: "list",
            pk: ["1", "2", "3"],
        });
    });

    scopedIt("detail route props read from params", () => {
        const [detail] = makeCRUDRoutes({ component, vueApp, router, pinia, actionRedirect });

        const props = detail.props({
            params: { app: "foo", model: "bar", action: "detail", pk: "42" },
        });

        expect(props).toEqual({
            app: "foo",
            model: "bar",
            action: "detail",
            pk: "42",
        });
    });

    scopedIt("throws when actionRedirect is missing", () => {
        expect(() => makeCRUDRoutes({ component, vueApp, router, pinia })).toThrow("makeCRUDRoutes: actionRedirect");
    });

    describe("Recheck after the authenticated user changes", () => {
        const authRedirect = { name: "login" };
        const groupsRedirect = { name: "denied" };
        let userStore;
        let watchingRouter;
        let currentRoute;

        /**
         * A route location in the shape Vue Router hands a guard.
         *
         * @param {string} name - The record name the location matched.
         * @param {string} fullPath - The location's full path.
         * @returns {object} The location.
         */
        const location = (name, fullPath = "/blog/post/list/") => ({
            name,
            fullPath,
            params: { app: "blog", model: "post", action: "list" },
            query: {},
        });

        /**
         * A promise a test resolves by hand, so it can act while a check is still pending.
         *
         * @returns {{promise: Promise<*>, resolve: (value: *) => void}} The promise and its resolver.
         */
        const deferred = () => {
            let settle;
            const promise = new Promise((resolve) => {
                settle = resolve;
            });
            return { promise, resolve: settle };
        };

        /**
         * Build the routes, then change the authenticated user and let the recheck run.
         *
         * @returns {Promise<void>}
         */
        const changeUser = async () => {
            makeCRUDRoutes({
                component,
                authRedirect,
                groups: ["admin"],
                groupsRedirect,
                actionRedirect,
                vueApp,
                router: watchingRouter,
                pinia,
            });
            userStore.identityGeneration += 1;
            await flushPromises();
        };

        beforeEach(() => {
            userStore = storeUser(pinia);
            currentRoute = ref(location("actionrouter.listview"));
            watchingRouter = { currentRoute, replace: vi.fn(() => Promise.resolve()), beforeEach: vi.fn() };
            requireAuth.mockResolvedValue(undefined);
            requireModelInfo.mockResolvedValue(true);
            requireGroups.mockResolvedValue(true);
        });

        scopedIt("reruns every configured check against the route on screen", async () => {
            await changeUser();

            expect(requireAuth).toHaveBeenCalledWith(authRedirect, currentRoute.value, watchingRouter, pinia);
            expect(requireModelInfo).toHaveBeenCalledWith(
                vueApp,
                actionRedirect,
                currentRoute.value,
                watchingRouter,
                pinia,
            );
            expect(requireGroups).toHaveBeenCalledWith(
                vueApp,
                expect.objectContaining({ summary: "Permission Denied" }),
                ["admin"],
                groupsRedirect,
                currentRoute.value,
                watchingRouter,
                pinia,
            );
        });

        scopedIt("keeps the current route when every check passes", async () => {
            await changeUser();

            expect(watchingRouter.replace).not.toHaveBeenCalled();
        });

        scopedIt("rechecks a detail route as well", async () => {
            currentRoute.value = location("actionrouter.detailview", "/blog/post/update/1");

            await changeUser();

            expect(requireModelInfo).toHaveBeenCalled();
        });

        scopedIt("redirects to the destination the failing check returns", async () => {
            requireModelInfo.mockResolvedValue(actionRedirect);

            await changeUser();

            expect(watchingRouter.replace).toHaveBeenCalledWith(actionRedirect);
        });

        scopedIt("stops at the first check that denies the route", async () => {
            requireAuth.mockResolvedValue(authRedirect);

            await changeUser();

            expect(watchingRouter.replace).toHaveBeenCalledWith(authRedirect);
            expect(requireModelInfo).not.toHaveBeenCalled();
            expect(requireGroups).not.toHaveBeenCalled();
        });

        scopedIt("leaves a route it did not generate alone", async () => {
            currentRoute.value = location("welcome", "/welcome/");

            await changeUser();

            expect(requireAuth).not.toHaveBeenCalled();
            expect(requireModelInfo).not.toHaveBeenCalled();
            expect(requireGroups).not.toHaveBeenCalled();
            expect(watchingRouter.replace).not.toHaveBeenCalled();
        });

        scopedIt("does not redirect on a check that cannot answer for the current user", async () => {
            requireModelInfo.mockResolvedValue(false);

            await changeUser();

            expect(watchingRouter.replace).not.toHaveBeenCalled();
            expect(requireGroups).not.toHaveBeenCalled();
        });

        scopedIt("abandons the recheck when another user change lands while a check is pending", async () => {
            const pending = deferred();
            // the first recheck waits on `pending`; the second gets an answer for the user who
            // replaced the one it was asked about
            requireModelInfo.mockReturnValueOnce(pending.promise).mockResolvedValue(true);

            await changeUser();
            userStore.identityGeneration += 1;
            await flushPromises();
            pending.resolve(actionRedirect);
            await flushPromises();

            expect(watchingRouter.replace).not.toHaveBeenCalled();
        });

        scopedIt("abandons the recheck when the application navigates while a check is pending", async () => {
            const pending = deferred();
            requireModelInfo.mockReturnValue(pending.promise);

            await changeUser();
            currentRoute.value = location("actionrouter.listview", "/blog/comment/list/");
            pending.resolve(actionRedirect);
            await flushPromises();

            expect(watchingRouter.replace).not.toHaveBeenCalled();
        });
    });
});
