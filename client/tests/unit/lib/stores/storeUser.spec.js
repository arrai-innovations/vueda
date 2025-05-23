import { scopedIt } from "@tests/unit/utils.js";
import { createPinia, setActivePinia } from "pinia";

const getUrl = vi.fn();
vi.mock("@vueda/utils/urls.js", () => ({ getUrl }));
const getCSRFValue = vi.fn(() => "csrftoken");
vi.mock("@vueda/utils/csrf.js", () => ({ getCSRFValue }));
const getJsonOrText = vi.fn();
vi.mock("@vueda/utils/fetchSupport.js", () => ({ getJsonOrText }));
vi.mock("@vueda/utils/connectionHostname.js", () => ({ httpOrHttpsHostname: "http://host" }));

let storeUserModule;
let storeUser;

beforeEach(async () => {
    setActivePinia(createPinia());
    getUrl.mockReset();
    getCSRFValue.mockClear();
    getJsonOrText.mockReset();
    global.fetch = vi.fn();
    storeUserModule = await import("@vueda/stores/storeUser.js");
    storeUser = storeUserModule.storeUser;
});

afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
});

scopedIt("fetchCurrentUser stores user and flags logged in", async () => {
    const user = { id: 1, username: "test" };
    const response = new Response(JSON.stringify(user), { status: 200 });
    getUrl.mockReturnValue("/current/");
    getJsonOrText.mockResolvedValue(user);
    fetch.mockResolvedValue(response);

    const store = storeUser();
    await store.fetchCurrentUser();

    expect(fetch).toHaveBeenCalledWith("http://host/current/", { method: "GET", credentials: "include" });
    expect(store.loggedIn).toBe(true);
    expect(store.loggedInUser).toEqual(user);
    expect(store.initialized).toBe(true);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.errored).toBe(false);
});

scopedIt("login triggers fetchCurrentUser on 204", async () => {
    const user = { id: 2, username: "bob" };
    const loginRes = new Response(null, { status: 204 });
    const fetchRes = new Response(JSON.stringify(user), { status: 200 });
    getUrl.mockReturnValueOnce("/login/").mockReturnValueOnce("/current/");
    getJsonOrText.mockResolvedValueOnce({}).mockResolvedValueOnce(user);
    fetch.mockResolvedValueOnce(loginRes).mockResolvedValueOnce(fetchRes);

    const store = storeUser();
    await store.login({ username: "u", password: "p" });

    expect(fetch).toHaveBeenNthCalledWith(1, "http://host/login/", {
        method: "POST",
        headers: { "X-CSRFToken": "csrftoken", "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: "u", password: "p" }),
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "http://host/current/", { method: "GET", credentials: "include" });
    expect(store.loggedIn).toBe(true);
    expect(store.loggedInUser).toEqual(user);
});

scopedIt("logout fetches and clears user", async () => {
    const user = {};
    const logoutRes = new Response(null, { status: 200 });
    const fetchRes = new Response(JSON.stringify(user), { status: 200 });
    getUrl.mockReturnValueOnce("/logout/").mockReturnValueOnce("/current/");
    getJsonOrText.mockResolvedValueOnce({}).mockResolvedValueOnce(user);
    fetch.mockResolvedValueOnce(logoutRes).mockResolvedValueOnce(fetchRes);

    const store = storeUser();
    store.loggedIn = true;
    await store.logout();

    expect(fetch).toHaveBeenNthCalledWith(1, "http://host/logout/", {
        method: "POST",
        headers: { "X-CSRFToken": "csrftoken", "Content-Type": "application/json" },
        credentials: "include",
    });
    expect(fetch).toHaveBeenNthCalledWith(2, "http://host/current/", { method: "GET", credentials: "include" });
    expect(store.loggedIn).toBe(false);
    expect(store.loggedInUser).toEqual(user);
});

scopedIt("init calls fetchCurrentUser when not initialized", async () => {
    const user = { id: 3 };
    const response = new Response(JSON.stringify(user), { status: 200 });
    getUrl.mockReturnValue("/current/");
    getJsonOrText.mockResolvedValue(user);
    fetch.mockResolvedValue(response);

    const store = storeUser();
    await store.init();

    expect(fetch).toHaveBeenCalledWith("http://host/current/", { method: "GET", credentials: "include" });
    expect(store.loggedIn).toBe(true);
    expect(store.loggedInUser).toEqual(user);
    expect(store.initialized).toBe(true);
    expect(store.initializingPromise).toBeInstanceOf(Promise);
});
