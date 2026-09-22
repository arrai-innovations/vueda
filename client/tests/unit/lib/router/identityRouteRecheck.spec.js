import { scopedIt } from "@tests/unit/utils.js";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { NavigationFailureType, createMemoryHistory, createRouter, isNavigationFailure } from "vue-router";

const routes = [];

/**
 * Answer a request whose URL contains `fragment`. Later registrations win, so a test can replace an
 * earlier answer for the same endpoint.
 *
 * @param {string} fragment - Substring identifying the endpoint.
 * @param {*} response - A value to resolve with, or a function receiving the URL.
 * @returns {void}
 */
const respond = (fragment, response) => {
    routes.unshift([fragment, response]);
};

const fetchHelper = vi.fn((url) => {
    for (const [fragment, response] of routes) {
        if (url.includes(fragment)) {
            return typeof response === "function" ? response(url) : Promise.resolve(response);
        }
    }
    return Promise.reject(new Error(`identityRouteRecheck.spec: no response registered for ${url}`));
});
vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper }));

const urls = {
    userCurrentUser: "/user/who-is/",
    userLogin: "/user/login/",
    userLogout: "/user/logout/",
    infoModelInfo: "/info/model-info/",
    workflowUserPermittedTransitions: "/workflow/permitted/",
};
vi.mock("@vueda/utils/urls.js", () => ({ getUrl: vi.fn((name) => urls[name] ?? `/unhandled/${name}/`) }));
vi.mock("@vueda/utils/connectionHostname.js", () => ({ httpOrHttpsHostname: "http://host" }));
vi.mock("@vueda/utils/csrf.js", () => ({ getCSRFValue: vi.fn(() => "csrf") }));

const toastMock = { error: vi.fn(), warning: vi.fn(), success: vi.fn(), info: vi.fn() };
vi.mock("@arrai-innovations/vue-sonner", () => ({ toast: toastMock }));

/**
 * A model-info payload in the shape the server sends it.
 *
 * @param {string} model - The model name.
 * @param {string[]} actionNames - The actions this user is permitted to perform.
 * @returns {object} The payload.
 */
const modelInfoPayload = (model, actionNames) => ({
    app_label: "blog",
    model,
    verbose_name: model,
    verbose_name_plural: `${model}s`,
    model_fields: {
        id: { pk: true, type_db: "AutoField" },
        title: { type_db: "CharField", label: "Title" },
    },
    model_actions: actionNames.map((name) => ({ name })),
    model_expands: [],
    model_ordering: { default: [], fields: [] },
    model_filtering: {},
    model_permissions: [],
});

const stub = { render: () => null };

describe("lib/router/makeCrud.js", () => {
    let makeCRUDRoutes;
    let storeUser;
    let pinia;
    let router;

    beforeEach(async () => {
        pinia = createPinia();
        setActivePinia(pinia);
        routes.length = 0;
        fetchHelper.mockClear();
        Object.values(toastMock).forEach((fn) => fn.mockClear());
        ({ makeCRUDRoutes } = await import("@vueda/router/makeCrud.js"));
        ({ storeUser } = await import("@vueda/stores/storeUser.js"));
        respond(urls.workflowUserPermittedTransitions, []);
        respond(urls.userLogin, {});
        respond(urls.userLogout, {});
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    /**
     * Answer the who-is endpoint with this user until told otherwise.
     *
     * @param {object} user - The who-is payload; `{}` for an anonymous session.
     * @returns {void}
     */
    const whoIs = (user) => respond(urls.userCurrentUser, user);

    /**
     * Answer the model-info endpoint for one model until told otherwise.
     *
     * @param {string} model - The model name.
     * @param {string[]} actionNames - The actions the current user is permitted to perform.
     * @returns {void}
     */
    const modelAllows = (model, actionNames) =>
        respond(`${urls.infoModelInfo}blog/${model}/`, () => Promise.resolve(modelInfoPayload(model, actionNames)));

    /**
     * Build a router carrying the generated CRUD records, a sign-in route, and a not-found route.
     *
     * @param {object} [options] - Options forwarded to `makeCRUDRoutes`.
     * @returns {import('vue-router').Router} The router.
     */
    const buildRouter = (options = {}) => {
        router = createRouter({ history: createMemoryHistory(), routes: [] });
        const records = [
            ...makeCRUDRoutes({
                component: stub,
                actionRedirect: { name: "not-found" },
                vueApp: {},
                router,
                pinia,
                ...options,
            }),
            { path: "/", name: "home", component: stub },
            { path: "/sign-in/", name: "sign-in", component: stub },
            { path: "/not-found/", name: "not-found", component: stub },
        ];
        for (const record of records) {
            router.addRoute(record);
        }
        return router;
    };

    /**
     * Build the router and let the first who-is establish who is authenticated, which is what an
     * application does through `requireAuth` or its own bootstrap. A change of user is only a change
     * once a first user is known.
     *
     * @param {object} user - The who-is payload for the first user.
     * @param {object} [options] - Options forwarded to `makeCRUDRoutes`.
     * @returns {Promise<void>}
     */
    const startAs = async (user, options = {}) => {
        whoIs(user);
        buildRouter(options);
        await storeUser(pinia).fetchCurrentUser();
        await router.push("/");
    };

    describe("Recheck after the authenticated user changes", () => {
        scopedIt("redirects when the new user's metadata no longer allows the action", async () => {
            modelAllows("post", ["list", "update"]);
            await startAs({ id: 1 });
            await router.push("/blog/post/list/");
            expect(router.currentRoute.value.name).toBe("actionrouter.listview");

            whoIs({ id: 2 });
            modelAllows("post", ["create"]);
            await storeUser(pinia).login({ username: "second", password: "second" });
            await flushPromises();

            expect(router.currentRoute.value.name).toBe("not-found");
            expect(toastMock.error).toHaveBeenCalledWith("Action Not Found");
        });

        scopedIt("replaces the denied route rather than pushing over it", async () => {
            modelAllows("post", ["list"]);
            await startAs({ id: 1 });
            await router.push("/blog/post/list/");

            whoIs({ id: 2 });
            modelAllows("post", ["create"]);
            await storeUser(pinia).login({ username: "second", password: "second" });
            await flushPromises();
            expect(router.currentRoute.value.name).toBe("not-found");

            router.back();
            await flushPromises();

            // the denied route is gone from history, so back reaches what preceded it
            expect(router.currentRoute.value.path).toBe("/");
        });

        scopedIt("keeps the current route when the new user may still use it", async () => {
            modelAllows("post", ["list"]);
            await startAs({ id: 1 });
            await router.push("/blog/post/list/");

            whoIs({ id: 2 });
            modelAllows("post", ["list"]);
            await storeUser(pinia).login({ username: "second", password: "second" });
            await flushPromises();

            expect(router.currentRoute.value.fullPath).toBe("/blog/post/list/");
            expect(toastMock.error).not.toHaveBeenCalled();

            router.back();
            await flushPromises();

            // no history entry was added, so back still reaches what preceded the current route
            expect(router.currentRoute.value.path).toBe("/");
        });

        scopedIt("sends a signed-out user to the configured sign-in route", async () => {
            modelAllows("post", ["list"]);
            await startAs({ id: 1 }, { authRedirect: { name: "sign-in" } });
            await router.push("/blog/post/list/");

            whoIs({});
            await storeUser(pinia).logout();
            await flushPromises();

            expect(router.currentRoute.value.name).toBe("sign-in");
            expect(router.currentRoute.value.query.redirect).toBe("/blog/post/list/");
        });

        scopedIt("leaves a route it did not generate alone", async () => {
            modelAllows("post", ["list"]);
            await startAs({ id: 1 });

            whoIs({ id: 2 });
            await storeUser(pinia).login({ username: "second", password: "second" });
            await flushPromises();

            expect(router.currentRoute.value.path).toBe("/");
            expect(toastMock.error).not.toHaveBeenCalled();
        });
    });

    describe("Recheck when navigation stays inside one route record", () => {
        scopedIt("redirects a move from an allowed model to a denied one", async () => {
            modelAllows("post", ["list"]);
            modelAllows("comment", []);
            await startAs({ id: 1 });
            await router.push("/blog/post/list/");
            expect(router.currentRoute.value.name).toBe("actionrouter.listview");

            const failure = await router.push("/blog/comment/list/");

            expect(router.currentRoute.value.name).toBe("not-found");
            expect(toastMock.error).toHaveBeenCalledWith("Action Not Found");
            expect(failure).toBeUndefined();
        });

        scopedIt("redirects a move to an action the model config omits, leaving the model unchanged", async () => {
            modelAllows("post", ["list"]);
            await startAs({ id: 1 });
            await router.push("/blog/post/list/");

            await router.push("/blog/post/create/");

            expect(router.currentRoute.value.name).toBe("not-found");
        });

        scopedIt("runs no metadata check on a query-only change, and keeps the current view mounted", async () => {
            modelAllows("post", ["list"]);
            await startAs({ id: 1 });
            await router.push("/blog/post/list/");
            fetchHelper.mockClear();

            await router.push("/blog/post/list/?page=2");

            expect(router.currentRoute.value.fullPath).toBe("/blog/post/list/?page=2");
            expect(fetchHelper).not.toHaveBeenCalled();
        });

        scopedIt("behaves as entering the record from outside, including the auth redirect", async () => {
            whoIs({});
            buildRouter({ authRedirect: { name: "sign-in" } });
            await storeUser(pinia).fetchCurrentUser();

            await router.push("/blog/post/list/");

            expect(router.currentRoute.value.name).toBe("sign-in");
        });
    });

    describe("Identity recheck racing a navigation that crosses route records", () => {
        scopedIt("preserves an identity denial when moving from bulk to detail update", async () => {
            modelAllows("post", ["update"]);
            await startAs({ id: 1 });
            await router.push("/blog/post/update/?pk=1,2");
            expect(router.currentRoute.value.name).toBe("actionrouter.listview");

            let releaseMetadata;
            respond(
                `${urls.infoModelInfo}blog/post/`,
                () =>
                    new Promise((resolve) => {
                        releaseMetadata = () => resolve(modelInfoPayload("post", []));
                    }),
            );
            whoIs({ id: 2 });
            await storeUser(pinia).login({ username: "second", password: "second" });
            await flushPromises();
            expect(releaseMetadata).toBeTypeOf("function");

            // this crosses from the list record to the detail record, which always reruns the checks,
            // even though the identity recheck above is still waiting on its own copy of the same
            // metadata
            const navigation = router.push("/blog/post/update/2");
            await flushPromises();
            releaseMetadata();
            await navigation;
            await flushPromises();

            expect(router.currentRoute.value.name).toBe("not-found");
        });
    });

    describe("Metadata fetched for a user who has since been replaced", () => {
        scopedIt("does not let it approve the navigation that fetched it", async () => {
            let releasePost;
            respond(
                `${urls.infoModelInfo}blog/post/`,
                () =>
                    new Promise((resolve) => {
                        releasePost = () => resolve(modelInfoPayload("post", ["list"]));
                    }),
            );
            await startAs({ id: 1 });

            // entering the record runs the guard chain, which parks on the metadata request
            const pending = router.push("/blog/post/list/");
            await flushPromises();
            expect(router.currentRoute.value.path).toBe("/");

            whoIs({ id: 2 });
            await storeUser(pinia).login({ username: "second", password: "second" });
            releasePost();
            const failure = await pending;
            await flushPromises();

            // the payload describes what the first user was permitted to see, so it cannot approve
            // this route for the second one
            expect(isNavigationFailure(failure, NavigationFailureType.aborted)).toBe(true);
            expect(router.currentRoute.value.path).toBe("/");
            expect(toastMock.error).not.toHaveBeenCalled();
        });
    });
});
