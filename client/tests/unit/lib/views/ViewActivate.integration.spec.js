import { scopedIt } from "@tests/unit/utils.js";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { LookupContextSymbol } from "@vueda/utils/symbols.js";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h, reactive, ref } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";

/**
 * Mounts ViewActivate over the real ViewSelectedObjectsAction, ModelActionForm, and ActionForm.
 *
 * These tests cover the request method that the view sends, which comes from the action's `methodNames` in model info.
 */

const modelConfig = reactive({
    loading: false,
    info: {},
    config: { verboseName: "customer", verboseNamePlural: "customers", fetchFields: [], expand: [] },
});
vi.mock("@vueda/use/useModelConfig.js", () => ({ useModelConfig: () => modelConfig }));
vi.mock("@vueda/use/useIsActive.js", () => ({ useIsActive: () => ref(true) }));
vi.mock("@vueda/use/usePageTitle.js", () => ({ usePageTitle: () => {} }));
vi.mock("@vueda/shell/page-title/PageActions.vue", () => ({
    default: defineComponent({
        setup:
            (_, { slots }) =>
            () =>
                h("div", slots.default?.()),
    }),
}));

const lookupContext = { requestObject: vi.fn(() => Promise.resolve({})) };
const records = [{ id: 1, formatted_name: "Vellum Press" }];

let ViewActivate;
let mockedFetch;

enableAutoUnmount(afterEach);

beforeEach(async () => {
    setActivePinia(createPinia());
    ViewActivate = (await import("@vueda/views/ViewActivate.vue")).default;
    (await import("@vueda/utils/listCrud.js")).setupDefaultListCrud();
    (await import("@vueda/utils/objectCrud.js")).setupDefaultObjectCrud();
    mockedFetch = vi.fn(async (url, options = {}) =>
        options.method && options.method !== "GET"
            ? new Response(JSON.stringify({ detail: "Activated." }), { status: 200 })
            : new Response(JSON.stringify({ results: records, totalPages: 1 }), { status: 200 }),
    );
    global.fetch = mockedFetch;
});

/**
 * Every write request that `fetch` saw, as `{ url, method }`.
 *
 * @returns {{url: string, method: string}[]} The captured requests.
 */
function writeRequests() {
    return mockedFetch.mock.calls
        .map(([url, options]) => ({ url: String(url), method: options?.method ?? "GET" }))
        .filter(({ method }) => method !== "GET");
}

/**
 * Mounts ViewActivate for one customer, with `activate` reported in model info with the given `methodNames`.
 *
 * @param {string[]} methodNames - The `methodNames` that model info reports for `activate`.
 * @returns {Promise<import('@vue/test-utils').VueWrapper>}
 */
async function mountViewActivate(methodNames) {
    modelConfig.info = {
        pk: "id",
        verboseName: "customer",
        verboseNamePlural: "customers",
        actions: [{ name: "activate", detail: true, bulk: true, methodNames, urlPath: "activate" }],
    };
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/", component: { template: "<div />" } }],
    });
    await router.push("/");
    const wrapper = mount(ViewActivate, {
        props: { app: "showcase", model: "customer", pk: "1" },
        attachTo: document.body,
        global: { plugins: [router], provide: { [LookupContextSymbol]: lookupContext } },
    });
    await flushPromises();
    return wrapper;
}

describe("lib/views/ViewActivate.vue", () => {
    describe("Request method from model info", () => {
        scopedIt("sends PATCH when model info lists it for activate", async () => {
            const wrapper = await mountViewActivate(["patch"]);

            expect(wrapper.find('[data-qa="action-form-view-only-message"]').exists()).toBe(false);
            expect(writeRequests()).toEqual([
                { url: expect.stringContaining("/showcase/customer/1/activate/"), method: "PATCH" },
            ]);
        });

        scopedIt("sends no request and disables confirm when model info gives activate no write method", async () => {
            const wrapper = await mountViewActivate([]);
            const confirm = wrapper.get('[data-qa="action-form-buttons"] button[type="submit"]');

            expect(confirm.attributes("disabled")).toBeDefined();
            expect(wrapper.get('[data-qa="action-form-view-only-message"]').text()).toBe(
                "Only viewing is permitted. You cannot activate this record.",
            );
            await confirm.trigger("click");
            await flushPromises();
            expect(writeRequests()).toEqual([]);
        });
    });
});
