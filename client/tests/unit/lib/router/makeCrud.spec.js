import { scopedIt } from "@tests/unit/utils.js";

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
    const component = {};
    const vueApp = {};
    const router = {};
    const pinia = {};
    const actionRedirect = { name: "not-found" };

    beforeEach(async () => {
        vi.resetModules();
        requireAuth.mockReset();
        requireGroups.mockReset();
        requireModelInfo.mockReset();
        ({ makeCRUDRoutes } = await import("@vueda/router/makeCrud.js"));
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
});
