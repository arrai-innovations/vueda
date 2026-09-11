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
    const router = {};
    const actionRedirect = { name: "not-found" };

    beforeEach(async () => {
        vi.resetModules();
        requireAuth.mockReset();
        requireGroups.mockReset();
        requireModelInfo.mockReset();
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
        expect(detail.beforeEnter).toBe(list.beforeEnter);
        const guards = detail.beforeEnter;
        expect(guards).toHaveLength(1);

        const to = { params: { app: "a", model: "b", action: "c", pk: "1" } };
        guards[0](to);
        expect(requireModelInfo).toHaveBeenCalledWith(vueApp, actionRedirect, to, router, pinia);
    });

    scopedIt("adds prefix and guards when provided", () => {
        const authRedirect = { name: "login" };
        const groups = ["admin"];
        const groupsRedirect = { name: "denied" };
        const actionRedirect = { name: "missing" };
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

        const to = { params: { app: "a", model: "b", action: "c", pk: "1" } };
        const guards = list.beforeEnter;
        expect(guards).toHaveLength(3);
        guards[0](to);
        guards[1](to);
        guards[2](to);

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
            watchingRouter = { currentRoute, replace: vi.fn(() => Promise.resolve()) };
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
