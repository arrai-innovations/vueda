import { scopedIt } from "@tests/unit/utils.js";
import { createPinia, setActivePinia } from "pinia";

const fetchHelper = vi.fn();
vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper }));
vi.mock("@vueda/utils/urls.js", () => ({ getUrl: vi.fn((name) => `/${name}/`) }));
vi.mock("@vueda/utils/connectionHostname.js", () => ({ httpOrHttpsHostname: "http://host" }));
vi.mock("@vueda/utils/csrf.js", () => ({ getCSRFValue: vi.fn(() => "csrf") }));
vi.mock("@arrai-innovations/vue-sonner", () => ({ toast: { error: vi.fn() } }));

/**
 * @returns {{promise: Promise<*>, resolve: (value: *) => void, reject: (error: Error) => void}}
 */
function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    return { promise, resolve, reject };
}

describe("lib/router/guards.js", () => {
    describe("Current-user request with the user store", () => {
        let guards;
        let pinia;
        const router = { resolve: (route) => route };
        const to = { fullPath: "/dest" };
        const currentUserCalls = () => fetchHelper.mock.calls.filter(([url]) => url.includes("/userCurrentUser/"));

        beforeEach(async () => {
            pinia = createPinia();
            setActivePinia(pinia);
            fetchHelper.mockReset();
            guards = await import("@vueda/router/guards.js");
        });

        afterEach(() => {
            vi.resetModules();
        });

        scopedIt("sends one request for guards that run at the same time", async () => {
            const response = deferred();
            fetchHelper.mockReturnValue(response.promise);

            const first = guards.requireAuth({ name: "login" }, to, router, pinia);
            const second = guards.requireGroups({}, {}, ["admin"], { name: "denied" }, to, router, pinia);
            response.resolve({ id: 1, groups: ["admin"] });

            expect(await first).toBeUndefined();
            expect(await second).toBe(true);
            expect(currentUserCalls()).toHaveLength(1);
        });
    });
});
