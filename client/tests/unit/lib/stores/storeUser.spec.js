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

scopedIt("fetchCurrentUser stores error when fetch fails", async () => {
    getUrl.mockReturnValue("/current/");
    fetch.mockRejectedValue(new Error("boom"));
    const store = storeUser();
    await expect(store.fetchCurrentUser()).rejects.toThrow("Error requesting current user");
    expect(store.error).toBeInstanceOf(Error);
    expect(store.error.message).toMatch("Error requesting current user");
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
    expect(store.loggedIn).toBe(false);
    expect(store.loggedInUser).toEqual({});
    expect(store.initialized).toBe(true);
});

scopedIt("fetchCurrentUser stores error on non-ok response", async () => {
    const response = new Response("{}", { status: 500 });
    getUrl.mockReturnValue("/current/");
    getJsonOrText.mockResolvedValue({});
    fetch.mockResolvedValue(response);
    const store = storeUser();
    await expect(store.fetchCurrentUser()).rejects.toThrow("Unexpected current user response");
    expect(store.error).toBeInstanceOf(Error);
    expect(store.error.message).toMatch("Unexpected current user response");
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
    expect(store.loggedIn).toBe(false);
    expect(store.loggedInUser).toEqual({});
    expect(store.initialized).toBe(true);
});

scopedIt("fetchCurrentUser stores error on invalid data", async () => {
    const response = new Response("bad", { status: 200 });
    getUrl.mockReturnValue("/current/");
    getJsonOrText.mockResolvedValue("notobject");
    fetch.mockResolvedValue(response);
    const store = storeUser();
    await expect(store.fetchCurrentUser()).rejects.toThrow("Unexpected current user response");
    expect(store.error).toBeInstanceOf(Error);
    expect(store.error.message).toMatch("Unexpected current user response");
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
    expect(store.loggedIn).toBe(false);
    expect(store.loggedInUser).toEqual({});
    expect(store.initialized).toBe(true);
});

scopedIt("login stores validation error on bad request", async () => {
    const { FormValidationError } = await vi.importActual("@vueda/utils/errors.js");
    const data = { detail: "invalid" };
    const response = new Response(JSON.stringify(data), { status: 400 });
    getUrl.mockReturnValue("/login/");
    getJsonOrText.mockResolvedValue(data);
    fetch.mockResolvedValue(response);

    const store = storeUser();
    await store.login({ username: "u", password: "p" });

    expect(store.error).toBeInstanceOf(FormValidationError);
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
});

scopedIt("login stores error on fetch failure", async () => {
    getUrl.mockReturnValue("/login/");
    fetch.mockRejectedValue(new Error("boom"));
    const store = storeUser();
    await store.login({ username: "u", password: "p" });
    expect(store.error).toBeInstanceOf(Error);
    expect(store.error.message).toMatch("Error sending authentication request");
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
});

scopedIt("logout does nothing when still logged out", async () => {
    const store = storeUser();
    store.fetchCurrentUser = vi.fn();
    await store.logout();
    expect(store.fetchCurrentUser).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
});

scopedIt("forgotPassword returns data on success", async () => {
    const data = { ok: true };
    const response = new Response(JSON.stringify(data), { status: 200 });
    getUrl.mockReturnValue("/forgot/");
    getJsonOrText.mockResolvedValue(data);
    fetch.mockResolvedValue(response);

    const store = storeUser();
    const result = await store.forgotPassword({ email: "a@b.c" });
    expect(result).toEqual(data);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
});

scopedIt("forgotPassword stores validation error", async () => {
    const { FormValidationError } = await vi.importActual("@vueda/utils/errors.js");
    const data = { email: ["required"] };
    const response = new Response(JSON.stringify(data), { status: 400 });
    getUrl.mockReturnValue("/forgot/");
    getJsonOrText.mockResolvedValue(data);
    fetch.mockResolvedValue(response);

    const store = storeUser();
    await store.forgotPassword({ email: "bad" });
    expect(store.error).toBeInstanceOf(FormValidationError);
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
});

scopedIt("resetPassword returns data on success", async () => {
    const data = { ok: true };
    const response = new Response(JSON.stringify(data), { status: 200 });
    getUrl.mockReturnValue("/reset/");
    getJsonOrText.mockResolvedValue(data);
    fetch.mockResolvedValue(response);

    const store = storeUser();
    const result = await store.resetPassword({ password: "p", password_confirm: "p" });
    expect(result).toEqual(data);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
});

scopedIt("resetPassword stores validation error", async () => {
    const { FormValidationError } = await vi.importActual("@vueda/utils/errors.js");
    const data = { password: ["short"] };
    const response = new Response(JSON.stringify(data), { status: 400 });
    getUrl.mockReturnValue("/reset/");
    getJsonOrText.mockResolvedValue(data);
    fetch.mockResolvedValue(response);

    const store = storeUser();
    await store.resetPassword({ password: "p", password_confirm: "p" });
    expect(store.error).toBeInstanceOf(FormValidationError);
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
});

scopedIt("resetPassword stores error on fetch failure", async () => {
    getUrl.mockReturnValue("/reset/");
    fetch.mockRejectedValue(new Error("boom"));
    const store = storeUser();
    await store.resetPassword({ password: "p", password_confirm: "p" });
    expect(store.error).toBeInstanceOf(Error);
    expect(store.error.message).toMatch("Error sending authentication request");
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
});

scopedIt("checkResetLinkIsValid stores invalid link error", async () => {
    const { InvalidResetPasswordLinkError } = await vi.importActual("@vueda/stores/storeUser.js");
    const data = { token: ["invalid"] };
    const response = new Response(JSON.stringify(data), { status: 400 });
    getUrl.mockReturnValue("/reset/{pk}/{token}/");
    getJsonOrText.mockResolvedValue(data);
    fetch.mockResolvedValue(response);

    const store = storeUser();
    await store.checkResetLinkIsValid({ pk: "1", token: "t" });
    expect(store.error).toBeInstanceOf(InvalidResetPasswordLinkError);
    expect(store.errored).toBe(true);
});
scopedIt("checkResetLinkIsValid returns data on success", async () => {
    const data = { ok: true };
    const response = new Response(JSON.stringify(data), { status: 200 });
    getUrl.mockReturnValue("/reset/{pk}/{token}/");
    getJsonOrText.mockResolvedValue(data);
    fetch.mockResolvedValue(response);

    const store = storeUser();
    const result = await store.checkResetLinkIsValid({ pk: "1", token: "t" });
    expect(result).toEqual(data);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
});
scopedIt("clearError resets error state", async () => {
    const error = new Error("boom");
    const store = storeUser();
    store.error = error;
    store.errored = true;

    store.clearError();

    expect(store.error).toBeNull();
    expect(store.errored).toBe(false);
});
