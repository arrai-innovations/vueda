import { scopedIt } from "@tests/unit/utils.js";
import { createPinia, setActivePinia } from "pinia";

const getUrl = vi.fn();
vi.mock("@vueda/utils/urls.js", () => ({ getUrl }));
const getCSRFValue = vi.fn(() => "csrftoken");
vi.mock("@vueda/utils/csrf.js", () => ({ getCSRFValue }));
const fetchHelper = vi.fn();
vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper }));
vi.mock("@vueda/utils/connectionHostname.js", () => ({ httpOrHttpsHostname: "http://host" }));

let storeUser;
let UnauthorizedError;

beforeEach(async () => {
    setActivePinia(createPinia());
    getUrl.mockReset();
    getCSRFValue.mockClear();
    fetchHelper.mockReset();
    ({ storeUser, UnauthorizedError } = await import("@vueda/stores/storeUser.js"));
});

afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
});

function expectFetchHelperCall(index, url, options, message) {
    const call = fetchHelper.mock.calls[index];
    expect(call[0]).toBe(url);
    if (options) {
        expect(call[1]).toMatchObject(options);
    }
    if (message) {
        expect(call[2]).toBe(message);
    }
}

scopedIt("fetchCurrentUser stores user and flags logged in", async () => {
    const user = { id: 1, username: "test" };
    getUrl.mockReturnValue("/current/");
    fetchHelper.mockResolvedValue(user);

    const store = storeUser();
    await store.fetchCurrentUser();

    expectFetchHelperCall(0, "http://host/current/", { method: "GET" }, "Error requesting current user");
    expect(store.loggedIn).toBe(true);
    expect(store.loggedInUser).toEqual(user);
    expect(store.initialized).toBe(true);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(store.errored).toBe(false);
});

scopedIt("login triggers fetchCurrentUser on success", async () => {
    const user = { id: 2, username: "bob" };
    getUrl.mockReturnValueOnce("/login/").mockReturnValueOnce("/current/");
    fetchHelper.mockResolvedValueOnce({}).mockResolvedValueOnce(user);

    const store = storeUser();
    await store.login({ username: "u", password: "p" });

    expectFetchHelperCall(
        0,
        "http://host/login/",
        {
            method: "POST",
            headers: { "X-CSRFToken": "csrftoken", "Content-Type": "application/json" },
            body: JSON.stringify({ username: "u", password: "p" }),
        },
        "Error sending authentication request",
    );
    expectFetchHelperCall(1, "http://host/current/", { method: "GET" }, "Error requesting current user");
    expect(store.loggedIn).toBe(true);
    expect(store.loggedInUser).toEqual(user);
});

scopedIt("logout fetches and clears user", async () => {
    const user = {};
    getUrl.mockReturnValueOnce("/logout/").mockReturnValueOnce("/current/");
    fetchHelper.mockResolvedValueOnce({}).mockResolvedValueOnce(user);

    const store = storeUser();
    store.loggedIn = true;
    await store.logout();

    expectFetchHelperCall(
        0,
        "http://host/logout/",
        {
            method: "POST",
            headers: { "X-CSRFToken": "csrftoken", "Content-Type": "application/json" },
        },
        "Error sending logout request",
    );
    expectFetchHelperCall(1, "http://host/current/", { method: "GET" }, "Error requesting current user");
    expect(store.loggedIn).toBe(false);
    expect(store.loggedInUser).toEqual(user);
});

scopedIt("init calls fetchCurrentUser when not initialized", async () => {
    const user = { id: 3 };
    getUrl.mockReturnValue("/current/");
    fetchHelper.mockResolvedValue(user);

    const store = storeUser();
    await store.init();

    expectFetchHelperCall(0, "http://host/current/", { method: "GET" }, "Error requesting current user");
    expect(store.loggedIn).toBe(true);
    expect(store.loggedInUser).toEqual(user);
    expect(store.initialized).toBe(true);
    expect(store.initializingPromise).toBeInstanceOf(Promise);
});

scopedIt("fetchCurrentUser stores error when fetch fails", async () => {
    const error = new Error("boom");
    getUrl.mockReturnValue("/current/");
    fetchHelper.mockRejectedValue(error);

    const store = storeUser();
    await expect(store.fetchCurrentUser()).rejects.toBe(error);
    expect(store.error).toBe(error);
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
    expect(store.loggedIn).toBe(false);
    expect(store.loggedInUser).toEqual({});
    expect(store.initialized).toBe(true);
});

scopedIt("fetchCurrentUser stores error on invalid data", async () => {
    const error = new Error("unexpected");
    getUrl.mockReturnValue("/current/");
    fetchHelper.mockRejectedValue(error);

    const store = storeUser();
    await expect(store.fetchCurrentUser()).rejects.toBe(error);
    expect(store.error).toBe(error);
    expect(store.errored).toBe(true);
});

scopedIt("login stores validation error on bad request", async () => {
    const { FormValidationError } = await vi.importActual("@vueda/utils/errors.js");
    getUrl.mockReturnValue("/login/");
    const error = new FormValidationError({ detail: "invalid" });
    fetchHelper.mockRejectedValue(error);

    const store = storeUser();
    await expect(store.login({ username: "u", password: "p" })).rejects.toBe(error);

    expect(store.error).toBe(error);
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
});

scopedIt("login stores error on fetch failure", async () => {
    getUrl.mockReturnValue("/login/");
    const error = new Error("Error sending authentication request");
    fetchHelper.mockRejectedValue(error);

    const store = storeUser();
    await expect(store.login({ username: "u", password: "p" })).rejects.toBe(error);
    expect(store.error).toBe(error);
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
});

scopedIt("logout does nothing when still logged out", async () => {
    const store = storeUser();
    store.fetchCurrentUser = vi.fn(() => Promise.resolve());
    store._performLogout = vi.fn(() => Promise.resolve());
    await store.logout();
    expect(store.fetchCurrentUser).toHaveBeenCalled();
    expect(store._performLogout).not.toHaveBeenCalled();
});

scopedIt("forgotPassword returns data on success", async () => {
    const data = { ok: true };
    getUrl.mockReturnValue("/forgot/");
    fetchHelper.mockResolvedValue(data);

    const store = storeUser();
    const result = await store.forgotPassword({ email: "a@b.c" });
    expect(result).toEqual(data);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
});

scopedIt("forgotPassword stores validation error", async () => {
    const { FormValidationError } = await vi.importActual("@vueda/utils/errors.js");
    getUrl.mockReturnValue("/forgot/");
    const error = new FormValidationError({ email: ["required"] });
    fetchHelper.mockRejectedValue(error);

    const store = storeUser();
    await expect(store.forgotPassword({ email: "bad" })).rejects.toBe(error);
    expect(store.error).toBe(error);
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
});

scopedIt("resetPassword returns data on success", async () => {
    const data = { ok: true };
    getUrl.mockReturnValue("/reset/");
    fetchHelper.mockResolvedValue(data);

    const store = storeUser();
    await expect(store.resetPassword({ password: "p", password_confirm: "p" })).resolves.toEqual(data);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
});

scopedIt("resetPassword stores validation error", async () => {
    const { FormValidationError } = await vi.importActual("@vueda/utils/errors.js");
    getUrl.mockReturnValue("/reset/");
    const error = new FormValidationError({ password: ["short"] });
    fetchHelper.mockRejectedValue(error);

    const store = storeUser();
    await expect(store.resetPassword({ password: "p", password_confirm: "p" })).rejects.toBe(error);
    expect(store.error).toBe(error);
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
});

scopedIt("resetPassword stores error on fetch failure", async () => {
    getUrl.mockReturnValue("/reset/");
    const error = new Error("Error sending authentication request");
    fetchHelper.mockRejectedValue(error);

    const store = storeUser();
    await expect(store.resetPassword({ password: "p", password_confirm: "p" })).rejects.toBe(error);
    expect(store.error).toBe(error);
    expect(store.errored).toBe(true);
    expect(store.loading).toBe(false);
});

scopedIt("checkResetLinkIsValid stores invalid link error", async () => {
    const { InvalidResetPasswordLinkError } = await vi.importActual("@vueda/stores/storeUser.js");
    getUrl.mockReturnValue("/reset/{pk}/{token}/");
    const error = new InvalidResetPasswordLinkError("invalid");
    fetchHelper.mockRejectedValue(error);

    const store = storeUser();
    await expect(store.checkResetLinkIsValid({ pk: "1", token: "t" })).rejects.toBeInstanceOf(
        InvalidResetPasswordLinkError,
    );
    expect(store.error).toBeInstanceOf(InvalidResetPasswordLinkError);
    expect(store.errored).toBe(true);
});

scopedIt("checkResetLinkIsValid returns data on success", async () => {
    const data = { ok: true };
    getUrl.mockReturnValue("/reset/{pk}/{token}/");
    fetchHelper.mockResolvedValue(data);

    const store = storeUser();
    await expect(store.checkResetLinkIsValid({ pk: "1", token: "t" })).resolves.toEqual(data);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
});

scopedIt("reauthenticate clears pending flow and refreshes user", async () => {
    getUrl.mockReturnValueOnce("/reauth/").mockReturnValueOnce("/current/");
    fetchHelper.mockResolvedValueOnce({}).mockResolvedValueOnce({ id: 5, recently_logged_in: true });

    const store = storeUser();
    store.pendingFlow = "flow";
    await store.reauthenticate({ method: "app" });

    expectFetchHelperCall(
        0,
        "http://host/reauth/",
        {
            method: "POST",
            headers: { "X-CSRFToken": "csrftoken", "Content-Type": "application/json" },
            body: JSON.stringify({ method: "app" }),
        },
        "Error sending authentication request",
    );
    expectFetchHelperCall(1, "http://host/current/", { method: "GET" }, "Error requesting current user");
    expect(store.pendingFlow).toBeNull();
    expect(store.loggedIn).toBe(true);
});

scopedIt("_handle_error stores pending flow on unauthorized error", async () => {
    const store = storeUser();
    store.fetchCurrentUser = vi.fn(() => Promise.resolve());
    const error = new UnauthorizedError("Unauthorized", undefined, { data: { flows: ["step1", "step2"] } });

    await store._handle_error(error);

    expect(store.pendingFlow).toBe("step2");
    expect(store.fetchCurrentUser).toHaveBeenCalled();
});

scopedIt("setupTOTPDevice forwards errors through _handle_error", async () => {
    getUrl.mockReturnValue("/setup/");
    const store = storeUser();
    const error = new UnauthorizedError("Unauthorized");
    const spy = vi.spyOn(store, "_handle_error").mockResolvedValue();
    fetchHelper.mockRejectedValue(error);

    await expect(store.setupTOTPDevice({ method: "app" })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith(error);
    spy.mockRestore();
});

scopedIt("getRecoveryCodes generates codes when none exist", async () => {
    getUrl.mockReturnValue("/recovery/");
    const store = storeUser();
    const generate = vi.fn(() => Promise.resolve({ data: { unused_codes: ["a"] } }));
    store.generateRecoveryCode = generate;
    fetchHelper.mockRejectedValue({ response: { status: 404 } });

    const result = await store.getRecoveryCodes();
    expect(generate).toHaveBeenCalled();
    expect(result).toEqual({ data: { unused_codes: ["a"] } });
});

scopedIt("twoFactorAuthenticate clears pending flow on success", async () => {
    getUrl.mockReturnValueOnce("/2fa/").mockReturnValueOnce("/current/");
    fetchHelper.mockResolvedValueOnce({}).mockResolvedValueOnce({ id: 10, recently_logged_in: true });

    const store = storeUser();
    store.pendingFlow = "2fa";
    await store.twoFactorAuthenticate({ code: "123456" });

    expectFetchHelperCall(
        0,
        "http://host/2fa/",
        {
            method: "POST",
            headers: { "X-CSRFToken": "csrftoken", "Content-Type": "application/json" },
            body: JSON.stringify({ code: "123456" }),
        },
        "Error sending authentication request",
    );
    expect(store.pendingFlow).toBeNull();
    expect(store.loggedIn).toBe(true);
});

scopedIt("clearError resets error state", () => {
    const error = new Error("boom");
    const store = storeUser();
    store.error = error;
    store.errored = true;

    store.clearError();

    expect(store.error).toBeNull();
    expect(store.errored).toBe(false);
});
