import { scopedIt } from "@tests/unit/utils.js";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { RouterView, createMemoryHistory, createRouter } from "vue-router";

const responses = [];

/**
 * Answer a request whose URL contains `fragment`. Later registrations win.
 *
 * @param {string} fragment - Substring identifying the endpoint.
 * @param {*} response - A value to resolve with, or a function receiving the URL.
 * @returns {void}
 */
const respond = (fragment, response) => {
    responses.unshift([fragment, response]);
};

const fetchHelper = vi.fn((url) => {
    for (const [fragment, response] of responses) {
        if (url.includes(fragment)) {
            return typeof response === "function" ? response(url) : Promise.resolve(response);
        }
    }
    return Promise.reject(new Error(`actionRedirect.integration.spec: no response registered for ${url}`));
});
vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper }));

const urls = {
    userCurrentUser: "/user/who-is/",
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
 * @param {string[]} actionNames - The actions this user is permitted to perform.
 * @returns {object} The payload.
 */
const modelInfoPayload = (actionNames) => ({
    app_label: "blog",
    model: "post",
    verbose_name: "post",
    verbose_name_plural: "posts",
    workflow_enabled: false,
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

/**
 * Reject the model-info request the way `storeModelInfo` does for a non-2xx response.
 *
 * @param {number} status - The response status.
 * @returns {() => Promise<never>} A response function for `respond`.
 */
const modelInfoFails = (status) => async () => {
    const { ModelInfoError } = await import("@vueda/stores/storeModelInfo.js");
    throw new ModelInfoError("Failed to fetch model info", { status }, { detail: "nope" });
};

const stub = { render: () => null };

describe("makeCRUDRoutes actionRedirect with a catch-all ViewNotFound", () => {
    let pinia;
    let router;
    let wrapper;

    beforeEach(async () => {
        pinia = createPinia();
        setActivePinia(pinia);
        responses.length = 0;
        respond(urls.workflowUserPermittedTransitions, []);
        respond(urls.userCurrentUser, { id: 1, username: "clerk" });
        const { makeCRUDRoutes } = await import("@vueda/router/makeCrud.js");
        const ViewNotFound = (await import("@vueda/views/ViewNotFound.vue")).default;
        router = createRouter({ history: createMemoryHistory(), routes: [] });
        // the setup that the integrator templates scaffold: a named catch-all as the destination
        const records = [
            ...makeCRUDRoutes({ component: stub, actionRedirect: { name: "not-found" }, vueApp: {}, router, pinia }),
            { path: "/", name: "home", component: stub },
            { path: "/:pathMatch(.*)*", name: "not-found", component: ViewNotFound },
        ];
        for (const record of records) {
            router.addRoute(record);
        }
        const Root = defineComponent({ render: () => h(RouterView) });
        wrapper = mount(Root, { global: { plugins: [router, pinia] } });
    });

    afterEach(() => {
        wrapper.unmount();
        vi.resetModules();
        vi.clearAllMocks();
    });

    /**
     * Assert that the not-found page describes the refused location rather than its own path.
     *
     * @param {string} location - The refused location.
     * @returns {void}
     */
    const expectRefusedPage = (location) => {
        expect(router.currentRoute.value.name).toBe("not-found");
        expect(router.currentRoute.value.query.redirect).toBe(location);
        const path = location.split("?")[0];
        expect(wrapper.find('[data-qa="system-message-card-crest-eyebrow"]').text()).toBe("Page unavailable");
        expect(wrapper.find('[data-qa="system-message-card-crest-kind"]').text()).toBe(path);
        expect(wrapper.find('[data-qa="system-message-card-crest-code"]').exists()).toBe(false);
        // the callout joins the path's segments, which leaves out a trailing slash
        expect(wrapper.find('[data-qa="view-not-found-tried"]').text()).toBe(`You tried${path.replace(/\/$/, "")}`);
        expect(wrapper.find('[data-qa="view-not-found-diagnostics"]').text()).toContain(location);
        expect(wrapper.find('[data-qa="view-not-found-blurb"]').text()).not.toContain("No registered route");
    };

    scopedIt("describes a CRUD URL whose action model info does not list", async () => {
        respond(`${urls.infoModelInfo}blog/post/`, () => Promise.resolve(modelInfoPayload(["list"])));

        await router.push("/blog/post/create/?returnPath=%2F");
        await flushPromises();

        expectRefusedPage("/blog/post/create/?returnPath=%2F");
        expect(toastMock.error).toHaveBeenCalledWith("Action Unavailable");
    });

    scopedIt("describes a CRUD URL whose model info request fails", async () => {
        respond(`${urls.infoModelInfo}blog/post/`, modelInfoFails(404));

        await router.push("/blog/post/list/");
        await flushPromises();

        expectRefusedPage("/blog/post/list/");
        expect(toastMock.error).toHaveBeenCalledWith("Model Not Found");
    });

    scopedIt("describes a CRUD URL whose model info the server refuses", async () => {
        respond(`${urls.infoModelInfo}blog/post/`, modelInfoFails(403));

        await router.push("/blog/post/read/4");
        await flushPromises();

        expectRefusedPage("/blog/post/read/4");
        expect(toastMock.error).toHaveBeenCalledWith("Permission Denied", { description: "nope", duration: 15000 });
    });
});
