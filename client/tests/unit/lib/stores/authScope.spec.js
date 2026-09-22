import { scopedIt } from "@tests/unit/utils.js";
import { getAppModelDotName, getAppModelViewDotName } from "@vueda/utils/case.js";
import { createPinia, setActivePinia } from "pinia";

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
    return Promise.reject(new Error(`authScope.spec: no response registered for ${url}`));
});
vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper }));

const urls = {
    userCurrentUser: "/user/who-is/",
    userLogin: "/user/login/",
    userLogout: "/user/logout/",
    infoModelInfo: "/info/model-info/",
    infoModelInfoChoices: "/info/choices/",
    infoModelInfoFilterChoices: "/info/filter-choices/",
    workflowUserPermittedTransitions: "/workflow/permitted/:app/:model/",
    workflowStates: "/workflow/states/",
    workflowObjectState: "/workflow/object-state/",
    workflowObjectTransitions: "/workflow/object-transitions/:app/:model/:pk/",
    historyWorkflowStateHistory: "/history/workflow-state-history/:app/:model/:pk/",
};
vi.mock("@vueda/utils/urls.js", () => ({ getUrl: vi.fn((name) => urls[name] ?? `/unhandled/${name}/`) }));
vi.mock("@vueda/utils/connectionHostname.js", () => ({ httpOrHttpsHostname: "http://host" }));
vi.mock("@vueda/utils/csrf.js", () => ({ getCSRFValue: vi.fn(() => "csrf") }));

/**
 * A model-info payload in the shape the server sends it.
 *
 * @param {string[]} actionNames - The actions this user is permitted to perform.
 * @param {string} titleLabel - A label used to tell one user's payload from another's.
 * @returns {object} The payload.
 */
const modelInfoPayload = (actionNames, titleLabel) => ({
    app_label: "blog",
    model: "post",
    verbose_name: titleLabel,
    verbose_name_plural: `${titleLabel}s`,
    model_fields: {
        id: { pk: true, type_db: "AutoField" },
        title: { type_db: "CharField", label: titleLabel },
    },
    model_actions: actionNames.map((name) => ({ name })),
    model_expands: [],
    model_ordering: { default: [], fields: [] },
    model_filtering: {},
    model_permissions: [],
});

describe("lib/stores/authScope.js", () => {
    const args = { app: "blog", model: "post" };
    const key = getAppModelDotName(args);
    let pinia;
    let storeUser, storeModelInfo, storeModelConfig, storeWorkflow, storeModelChoices;
    let AuthScopeInvalidatedError;

    beforeEach(async () => {
        pinia = createPinia();
        setActivePinia(pinia);
        routes.length = 0;
        fetchHelper.mockClear();
        ({ storeUser } = await import("@vueda/stores/storeUser.js"));
        ({ storeModelInfo } = await import("@vueda/stores/storeModelInfo.js"));
        ({ storeModelConfig } = await import("@vueda/stores/storeModelConfig.js"));
        ({ storeWorkflow } = await import("@vueda/stores/storeWorkflow.js"));
        ({ storeModelChoices } = await import("@vueda/stores/storeModelChoices.js"));
        ({ AuthScopeInvalidatedError } = await import("@vueda/utils/errors.js"));
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

    describe("crossing the authentication boundary", () => {
        scopedIt("drops every authorization-dependent cache when a second user logs in", async () => {
            whoIs({ id: 1, groups: ["editors"] });
            respond(urls.infoModelInfo, () => Promise.resolve(modelInfoPayload(["list", "update"], "First")));
            respond(urls.workflowUserPermittedTransitions.split(":")[0], [{ code: "publish", name: "Publish" }]);
            respond(urls.workflowObjectState, { state: { code: "draft" } });
            respond(urls.infoModelInfoChoices, ["draft", "published"]);
            respond(urls.infoModelInfoFilterChoices, ["editors"]);
            respond(urls.userLogin, {});
            respond(urls.userLogout, {});

            const userStore = storeUser(pinia);
            const infoStore = storeModelInfo(pinia);
            const configStore = storeModelConfig(pinia);
            const workflowStore = storeWorkflow(pinia);
            const choicesStore = storeModelChoices(pinia);

            await userStore.fetchCurrentUser();

            configStore.setConfig(args, { allowColumnHiding: true }, { list: { sorted: ["title"] } });
            await infoStore.fetchModelInfo(args);
            await configStore.getConfig(args);
            await configStore.getConfig({ ...args, view: "list" });
            await workflowStore.fetchWorkflowTransition(args.app, args.model);
            await workflowStore.fetchObjectState(args.app, args.model, "1");
            await choicesStore.fetchChoices(args.app, args.model, "status");
            await choicesStore.fetchFilterChoices(args.app, args.model, "author");

            expect(infoStore.infos[key].actions.map((a) => a.name)).toEqual(["list", "update"]);
            expect(configStore.builtConfigs[key]).toBeDefined();
            expect(configStore.builtConfigs[getAppModelViewDotName({ ...args, view: "list" })]).toBeDefined();
            expect(workflowStore.workflowTransitions[key]).toHaveLength(1);
            expect(workflowStore.objectStates[key]["1"]).toBeDefined();
            expect(choicesStore.choices[key].status).toEqual(["draft", "published"]);
            expect(choicesStore.filterChoices[key].author).toEqual(["editors"]);

            whoIs({});
            await userStore.logout();
            whoIs({ id: 2, groups: ["viewers"] });
            await userStore.login({ username: "second", password: "second" });

            expect(infoStore.infos).toEqual({});
            expect(infoStore.errors).toEqual({});
            expect(infoStore.promises).toEqual({});
            expect(configStore.builtConfigs).toEqual({});
            expect(configStore.initialized).toEqual({});
            expect(workflowStore.workflowTransitions).toEqual({});
            expect(workflowStore.objectStates).toEqual({});
            expect(choicesStore.choices).toEqual({});
            expect(choicesStore.filterChoices).toEqual({});

            // the integrator's own overrides are input, not server data
            expect(configStore.genericConfigs[key]).toEqual({ allowColumnHiding: true });
            expect(configStore.specificConfigs[getAppModelViewDotName({ ...args, view: "list" })]).toEqual({
                sorted: ["title"],
            });

            // and the next request goes to the server and caches what the second user is permitted to see
            respond(urls.infoModelInfo, () => Promise.resolve(modelInfoPayload(["list"], "Second")));
            fetchHelper.mockClear();
            const refetched = await infoStore.fetchModelInfo(args);

            expect(fetchHelper).toHaveBeenCalledTimes(1);
            expect(fetchHelper.mock.calls[0][0]).toContain(urls.infoModelInfo);
            expect(refetched.actions.map((a) => a.name)).toEqual(["list"]);
            expect(infoStore.infos[key].verbose_name).toBe("Second");
        });

        scopedIt("does not clear when the same user is refreshed", async () => {
            whoIs({ id: 1, recently_logged_in: false });
            respond(urls.infoModelInfo, () => Promise.resolve(modelInfoPayload(["list"], "First")));

            const userStore = storeUser(pinia);
            const infoStore = storeModelInfo(pinia);

            await userStore.fetchCurrentUser();
            await infoStore.fetchModelInfo(args);

            // the reauthenticate and activateTOTPDevice shapes
            whoIs({ id: 1, recently_logged_in: true, totp_devices: ["device"] });
            await userStore.fetchCurrentUser();

            expect(infoStore.infos[key]).toBeDefined();
            expect(userStore.identityGeneration).toBe(0);
        });

        scopedIt("does not clear when the first who-is establishes the user", async () => {
            respond(urls.infoModelInfo, () => Promise.resolve(modelInfoPayload(["list"], "First")));
            const infoStore = storeModelInfo(pinia);
            await infoStore.fetchModelInfo(args);

            // anything fetched before the first who-is used the same session cookie who-is reports on
            whoIs({ id: 1 });
            await storeUser(pinia).fetchCurrentUser();

            expect(infoStore.infos[key]).toBeDefined();
            expect(storeUser(pinia).identityGeneration).toBe(0);
        });

        scopedIt("leaves stores the application never used uninstantiated", async () => {
            whoIs({ id: 1 });
            const userStore = storeUser(pinia);
            const infoStore = storeModelInfo(pinia);
            respond(urls.infoModelInfo, () => Promise.resolve(modelInfoPayload(["list"], "First")));

            await userStore.fetchCurrentUser();
            await infoStore.fetchModelInfo(args);

            whoIs({ id: 2 });
            await userStore.fetchCurrentUser();

            expect(infoStore.infos).toEqual({});
            expect(pinia.state.value.modelConfig).toBeUndefined();
            expect(pinia.state.value.workflow).toBeUndefined();
            expect(pinia.state.value.modelChoices).toBeUndefined();
        });

        scopedIt("leaves stores that do not depend on authorization alone", async () => {
            whoIs({ id: 1 });
            const userStore = storeUser(pinia);
            const { storeTheme } = await import("@vueda/stores/storeTheme.js");
            const { storeDarkMode } = await import("@vueda/stores/storeDarkMode.js");
            const { storeCollapseNav } = await import("@vueda/stores/storeCollapseNav.js");
            const { storeListPreference } = await import("@vueda/stores/storeListPreference.js");

            const themeStore = storeTheme(pinia);
            const darkModeStore = storeDarkMode(pinia);
            const collapseNavStore = storeCollapseNav(pinia);
            const listPreferenceStore = storeListPreference(pinia);

            themeStore.registerComponent("Button", { defaultVariant: "primary", spots: ["base"] });
            themeStore.registerVariant("Button", "primary", { base: "btn" });
            darkModeStore.isDark = true;
            collapseNavStore.isCollapsed = true;
            listPreferenceStore.setFilters(args, { status: "draft" });

            await userStore.fetchCurrentUser();
            whoIs({ id: 2 });
            await userStore.fetchCurrentUser();

            expect(themeStore.components.Button.defaultVariant).toBe("primary");
            expect(themeStore.variants.Button.primary.base).toBe("btn");
            expect(darkModeStore.isDark).toBe(true);
            expect(collapseNavStore.isCollapsed).toBe(true);
            expect(listPreferenceStore.getFilters(args)).toEqual({ status: "draft" });
        });
    });

    describe("responses that arrive after the crossing", () => {
        /**
         * Register a deferred answer for one endpoint.
         *
         * @param {string} fragment - Substring identifying the endpoint.
         * @returns {{settle: (value: any) => void, fail: (error: Error) => void}} Controls for the answer.
         */
        const deferResponse = (fragment) => {
            let settle, fail;
            const deferred = new Promise((resolve, reject) => {
                settle = resolve;
                fail = reject;
            });
            respond(fragment, () => deferred);
            return { settle, fail };
        };

        scopedIt("discards a successful model-info response and refetches on the next call", async () => {
            whoIs({ id: 1 });
            const userStore = storeUser(pinia);
            const infoStore = storeModelInfo(pinia);
            await userStore.fetchCurrentUser();

            const deferred = deferResponse(urls.infoModelInfo);
            const inFlight = infoStore.fetchModelInfo(args);

            whoIs({ id: 2 });
            await userStore.fetchCurrentUser();
            deferred.settle(modelInfoPayload(["list", "update"], "First"));

            await expect(inFlight).rejects.toThrow(AuthScopeInvalidatedError);
            expect(infoStore.infos).toEqual({});

            respond(urls.infoModelInfo, () => Promise.resolve(modelInfoPayload(["list"], "Second")));
            fetchHelper.mockClear();
            const refetched = await infoStore.fetchModelInfo(args);

            expect(fetchHelper).toHaveBeenCalledTimes(1);
            expect(refetched.verbose_name).toBe("Second");
        });

        scopedIt("discards a config build in flight across the crossing", async () => {
            whoIs({ id: 1 });
            const userStore = storeUser(pinia);
            const configStore = storeModelConfig(pinia);
            await userStore.fetchCurrentUser();

            const deferred = deferResponse(urls.infoModelInfo);
            const inFlight = configStore.getConfig(args);

            whoIs({ id: 2 });
            await userStore.fetchCurrentUser();
            deferred.settle(modelInfoPayload(["list", "update"], "First"));

            await expect(inFlight).rejects.toThrow(AuthScopeInvalidatedError);
            expect(configStore.builtConfigs).toEqual({});
            expect(configStore.initialized).toEqual({});

            respond(urls.infoModelInfo, () => Promise.resolve(modelInfoPayload(["list"], "Second")));
            const rebuilt = await configStore.getConfig(args);
            expect(rebuilt.verboseName).toBe("Second");
        });

        scopedIt("discards choices that arrive after the crossing", async () => {
            whoIs({ id: 1 });
            const userStore = storeUser(pinia);
            const choicesStore = storeModelChoices(pinia);
            await userStore.fetchCurrentUser();

            const deferred = deferResponse(urls.infoModelInfoChoices);
            const inFlight = choicesStore.fetchChoices(args.app, args.model, "status");

            whoIs({ id: 2 });
            await userStore.fetchCurrentUser();
            deferred.settle(["draft", "published"]);

            await expect(inFlight).rejects.toThrow(AuthScopeInvalidatedError);
            expect(choicesStore.choices).toEqual({});

            respond(urls.infoModelInfoChoices, ["draft"]);
            const refetched = await choicesStore.fetchChoices(args.app, args.model, "status");
            expect(refetched).toEqual(["draft"]);
        });

        scopedIt("does not cache a model-info error that arrives after the crossing", async () => {
            whoIs({ id: 1 });
            const userStore = storeUser(pinia);
            const infoStore = storeModelInfo(pinia);
            await userStore.fetchCurrentUser();

            const deferred = deferResponse(urls.infoModelInfo);
            const inFlight = infoStore.fetchModelInfo(args);

            whoIs({ id: 2 });
            await userStore.fetchCurrentUser();
            deferred.fail(new Error("Forbidden"));

            await expect(inFlight).rejects.toThrow("Forbidden");
            expect(infoStore.errors).toEqual({});

            respond(urls.infoModelInfo, () => Promise.resolve(modelInfoPayload(["list"], "Second")));
            fetchHelper.mockClear();
            const refetched = await infoStore.fetchModelInfo(args);

            expect(fetchHelper).toHaveBeenCalledTimes(1);
            expect(refetched.verbose_name).toBe("Second");
        });

        scopedIt("discards a workflow-transitions rejection that arrives after the crossing", async () => {
            whoIs({ id: 1 });
            const userStore = storeUser(pinia);
            const workflowStore = storeWorkflow(pinia);
            await userStore.fetchCurrentUser();

            const deferred = deferResponse(urls.workflowUserPermittedTransitions.split(":")[0]);
            const inFlight = workflowStore.fetchWorkflowTransition(args.app, args.model);

            whoIs({ id: 2 });
            await userStore.fetchCurrentUser();
            deferred.fail(new Error("Forbidden"));

            // the rejection was determined for the principal the crossing just replaced, so it must
            // not reach the caller as-is, the same as a stale success response above
            await expect(inFlight).rejects.toThrow(AuthScopeInvalidatedError);
            expect(workflowStore.errors.workflowTransitions).toEqual({});

            respond(urls.workflowUserPermittedTransitions.split(":")[0], [{ code: "review", name: "Review" }]);
            fetchHelper.mockClear();
            const refetched = await workflowStore.fetchWorkflowTransition(args.app, args.model);

            expect(fetchHelper).toHaveBeenCalledTimes(1);
            expect(refetched).toEqual([{ code: "review", name: "Review" }]);
        });
    });
});
