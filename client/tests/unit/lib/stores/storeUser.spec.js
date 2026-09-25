import { scopedIt } from "@tests/unit/utils.js";
import { createPinia, setActivePinia } from "pinia";

const getUrl = vi.fn();
vi.mock("@vueda/utils/urls.js", () => ({ getUrl }));
const getCSRFValue = vi.fn(() => "csrftoken");
vi.mock("@vueda/utils/csrf.js", () => ({ getCSRFValue }));
const fetchHelper = vi.fn();
vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper }));
vi.mock("@vueda/utils/connectionHostname.js", () => ({ httpOrHttpsHostname: "http://host" }));
const clearAuthScopedStores = vi.fn();
vi.mock("@vueda/stores/authScope.js", () => ({ clearAuthScopedStores }));

describe("lib/stores/storeUser.js", () => {
    let storeUser;
    let UnauthorizedError;
    let FormValidationErrorClass;

    beforeEach(async () => {
        setActivePinia(createPinia());
        getUrl.mockReset();
        getCSRFValue.mockClear();
        fetchHelper.mockReset();
        ({ storeUser, UnauthorizedError } = await import("@vueda/stores/storeUser.js"));
        ({ FormValidationError: FormValidationErrorClass } = await vi.importActual("@vueda/utils/errors.js"));
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

    describe("fetchCurrentUser", () => {
        scopedIt("stores user and flags logged in", async () => {
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

        scopedIt("stores error when fetch fails", async () => {
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

        scopedIt("stores error on invalid data", async () => {
            const error = new Error("unexpected");
            getUrl.mockReturnValue("/current/");
            fetchHelper.mockRejectedValue(error);

            const store = storeUser();
            await expect(store.fetchCurrentUser()).rejects.toBe(error);
            expect(store.error).toBe(error);
            expect(store.errored).toBe(true);
        });

        scopedIt("preserves error state when requested", async () => {
            const error = new Error("existing");
            getUrl.mockReturnValue("/current/");
            fetchHelper.mockResolvedValue({ id: 4 });

            const store = storeUser();
            store.error = error;
            store.errored = true;

            await store.fetchCurrentUser({ preserveError: true });

            expect(store.error).toBe(error);
            expect(store.errored).toBe(true);
        });
    });

    describe("init", () => {
        scopedIt("calls fetchCurrentUser when not initialized", async () => {
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
    });

    describe("login", () => {
        scopedIt("triggers fetchCurrentUser on success", async () => {
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

        scopedIt("stores validation error on bad request", async () => {
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

        scopedIt("handles UnauthorizedError by refetching user and setting error state", async () => {
            const error = new UnauthorizedError("Unauthorized");
            getUrl.mockReturnValue("/login/");
            fetchHelper.mockRejectedValueOnce(error);

            const store = storeUser();
            const fetchCurrentUser = vi.spyOn(store, "fetchCurrentUser").mockResolvedValue();
            await expect(store.login({ username: "u", password: "p" })).rejects.toBe(error);

            expect(fetchCurrentUser).toHaveBeenCalledWith({ preserveError: true });
            expect(store.errored).toBe(true);
            expect(store.error).toBe(error);
        });

        scopedIt("stores error on fetch failure", async () => {
            getUrl.mockReturnValue("/login/");
            const error = new Error("Error sending authentication request");
            fetchHelper.mockRejectedValue(error);

            const store = storeUser();
            await expect(store.login({ username: "u", password: "p" })).rejects.toBe(error);
            expect(store.error).toBe(error);
            expect(store.errored).toBe(true);
            expect(store.loading).toBe(false);
        });

        scopedIt("treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/login/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(store.login({ username: "u", password: "p" })).rejects.toBeInstanceOf(
                FormValidationErrorClass,
            );
        });
    });

    describe("logout", () => {
        scopedIt("fetches and clears user", async () => {
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

        scopedIt("does nothing when still logged out", async () => {
            const store = storeUser();
            store.fetchCurrentUser = vi.fn(() => Promise.resolve());
            store._performLogout = vi.fn(() => Promise.resolve());
            await store.logout();
            expect(store.fetchCurrentUser).toHaveBeenCalled();
            expect(store._performLogout).not.toHaveBeenCalled();
        });
    });

    describe("reauthenticate", () => {
        scopedIt("clears pending flow and refreshes user", async () => {
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

        scopedIt("treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/reauth/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(store.reauthenticate({ method: "app" })).rejects.toBeInstanceOf(FormValidationErrorClass);
        });

        const handleFlows = async (flows) => {
            const store = storeUser();
            store.fetchCurrentUser = vi.fn(() => Promise.resolve());
            await store._handle_error(new UnauthorizedError("Unauthorized", undefined, { data: { flows } }));
            return store;
        };

        scopedIt("_handle_error stores the flow marked pending, wherever it sits", async () => {
            const mfa = { id: "mfa_authenticate", is_pending: true, types: ["totp"] };
            const store = await handleFlows([
                { id: "login" },
                mfa,
                { id: "password_reset_by_code", is_pending: false },
            ]);

            expect(store.pendingFlow).toEqual(mfa);
            expect(store.errored).toBe(false);
            expect(store.error).toBe(null);
        });

        scopedIt("_handle_error stores the reauthentication flow when none is marked pending", async () => {
            const store = await handleFlows([
                { id: "reauthenticate" },
                { id: "mfa_reauthenticate" },
                { id: "password_reset_by_code", is_pending: false },
            ]);

            expect(store.pendingFlow).toEqual({ id: "reauthenticate" });
        });

        scopedIt("_handle_error clears the pending flow when the response lists only available flows", async () => {
            const store = await handleFlows([{ id: "login" }, { id: "signup" }]);

            expect(store.pendingFlow).toBeNull();
        });
    });

    describe("Password management", () => {
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

        scopedIt("forgotPassword treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/forgot/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(store.forgotPassword({ email: "test@domain.invalid" })).rejects.toBeInstanceOf(
                FormValidationErrorClass,
            );
        });

        scopedIt("changePassword posts payload", async () => {
            const payload = { old_password: "old", new_password1: "new", new_password2: "new" };
            getUrl.mockReturnValue("/change/");
            fetchHelper.mockResolvedValue({ ok: true });

            const store = storeUser();
            await expect(store.changePassword(payload)).resolves.toEqual({ ok: true });

            expectFetchHelperCall(
                0,
                "http://host/change/",
                {
                    method: "POST",
                    headers: { "X-CSRFToken": "csrftoken", "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
                "Error sending authentication request",
            );
            expect(store.error).toBeNull();
            expect(store.errored).toBe(false);
            expect(store.loading).toBe(false);
        });

        scopedIt("changePassword stores validation error", async () => {
            const { FormValidationError } = await vi.importActual("@vueda/utils/errors.js");
            getUrl.mockReturnValue("/change/");
            const error = new FormValidationError({ old_password: ["wrong"] });
            fetchHelper.mockRejectedValue(error);

            const store = storeUser();
            await expect(store.changePassword({ old_password: "old" })).rejects.toBe(error);
            expect(store.error).toBe(error);
            expect(store.errored).toBe(true);
            expect(store.loading).toBe(false);
        });

        scopedIt("changePassword treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/change/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(
                store.changePassword({ old_password: "old", new_password1: "new", new_password2: "new" }),
            ).rejects.toBeInstanceOf(FormValidationErrorClass);
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

        scopedIt("resetPassword treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/reset/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(store.resetPassword({ password: "p", password_confirm: "p" })).rejects.toBeInstanceOf(
                FormValidationErrorClass,
            );
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
    });

    describe("Two-factor authentication", () => {
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

        scopedIt("twoFactorAuthenticate treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/2fa/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(store.twoFactorAuthenticate({ code: "123456" })).rejects.toBeInstanceOf(
                FormValidationErrorClass,
            );
        });

        scopedIt("getTwoFactorAuthMethod treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/totp/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(store.getTwoFactorAuthMethod()).rejects.toBeInstanceOf(FormValidationErrorClass);
        });

        scopedIt("sendTwoFactorAuthenticationCode treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/totp/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(store.sendTwoFactorAuthenticationCode({ method: "email" })).rejects.toBeInstanceOf(
                FormValidationErrorClass,
            );
        });
    });

    describe("TOTP device management", () => {
        scopedIt("setupTOTPDevice treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/setup/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(store.setupTOTPDevice({ method: "app" })).rejects.toBeInstanceOf(FormValidationErrorClass);
        });

        scopedIt("setupTOTPDevice throw UnauthorizedError", async () => {
            getUrl.mockReturnValue("/setup/");
            const store = storeUser();
            const error = new UnauthorizedError("Unauthorized");
            fetchHelper.mockRejectedValueOnce(error);
            const fetchCurrentUser = vi.spyOn(store, "fetchCurrentUser").mockResolvedValue();
            await expect(store.setupTOTPDevice({ method: "app" })).rejects.toBe(error);
            expect(fetchCurrentUser).toHaveBeenCalledWith({ preserveError: true });
            expect(store.error).toBe(error);
            expect(store.errored).toBe(true);
        });

        scopedIt("activateTOTPDevice treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/activate/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(store.activateTOTPDevice({ code: "123456" })).rejects.toBeInstanceOf(FormValidationErrorClass);
        });

        scopedIt("activateTOTPDevice throw UnauthorizedError with empty pending flows", async () => {
            getUrl.mockReturnValue("/activate/");
            const store = storeUser();
            const error = new UnauthorizedError("Unauthorized");
            fetchHelper.mockRejectedValueOnce(error);
            const fetchCurrentUser = vi.spyOn(store, "fetchCurrentUser").mockResolvedValue();
            await expect(store.activateTOTPDevice({ method: "app" })).rejects.toBe(error);
            expect(fetchCurrentUser).toHaveBeenCalledWith({ preserveError: true });
            expect(store.error).toBe(error);
            expect(store.errored).toBe(true);
        });
    });

    describe("Recovery codes", () => {
        scopedIt("generateRecoveryCode treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/recovery/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(store.generateRecoveryCode()).rejects.toBeInstanceOf(FormValidationErrorClass);
        });

        scopedIt("getRecoveryCodes treats 400 responses as FormValidationError", async () => {
            getUrl.mockReturnValue("/recovery/");
            fetchHelper.mockImplementation((...fetchArgs) => {
                const resolver = fetchArgs[6];
                return Promise.reject(resolver({ status: 400 }, { detail: "invalid" }));
            });

            const store = storeUser();
            await expect(store.getRecoveryCodes()).rejects.toBeInstanceOf(FormValidationErrorClass);
        });

        scopedIt("getRecoveryCodes throw UnauthorizedError", async () => {
            getUrl.mockReturnValue("/recovery/");
            const store = storeUser();
            const error = new UnauthorizedError("Unauthorized");
            fetchHelper.mockRejectedValueOnce(error);
            const fetchCurrentUser = vi.spyOn(store, "fetchCurrentUser").mockResolvedValue();
            await expect(store.getRecoveryCodes({ method: "app" })).rejects.toBe(error);
            expect(fetchCurrentUser).toHaveBeenCalledWith({ preserveError: true });
            expect(store.error).toBe(error);
            expect(store.errored).toBe(true);
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
    });

    describe("clearError", () => {
        scopedIt("resets error state", () => {
            const error = new Error("boom");
            const store = storeUser();
            store.error = error;
            store.errored = true;

            store.clearError();

            expect(store.error).toBeNull();
            expect(store.errored).toBe(false);
        });
    });
    describe("Authentication boundary", () => {
        const whoIsSequence = (...users) => {
            getUrl.mockReturnValue("/current/");
            for (const user of users) {
                fetchHelper.mockResolvedValueOnce(user);
            }
        };

        scopedIt("does not clear on the first who-is response", async () => {
            whoIsSequence({ id: 1 });
            const store = storeUser();

            await store.fetchCurrentUser();

            expect(clearAuthScopedStores).not.toHaveBeenCalled();
            expect(store.principalId).toBe(1);
            expect(store.identityGeneration).toBe(0);
        });

        scopedIt("does not clear when the same user is refreshed", async () => {
            // the reauthenticate and activateTOTPDevice shapes: same principal, other fields changed
            whoIsSequence(
                { id: 1, recently_logged_in: false, totp_devices: [] },
                { id: 1, recently_logged_in: true, totp_devices: ["device"] },
            );
            const store = storeUser();

            await store.fetchCurrentUser();
            await store.fetchCurrentUser();

            expect(clearAuthScopedStores).not.toHaveBeenCalled();
            expect(store.identityGeneration).toBe(0);
        });

        scopedIt("clears when an anonymous session becomes a user", async () => {
            whoIsSequence({}, { id: 1 });
            const store = storeUser();

            await store.fetchCurrentUser();
            expect(store.principalId).toBeNull();
            await store.fetchCurrentUser();

            expect(clearAuthScopedStores).toHaveBeenCalledTimes(1);
            expect(store.principalId).toBe(1);
            expect(store.identityGeneration).toBe(1);
        });

        scopedIt("clears when a user logs out", async () => {
            whoIsSequence({ id: 1 }, {});
            const store = storeUser();

            await store.fetchCurrentUser();
            await store.fetchCurrentUser();

            expect(clearAuthScopedStores).toHaveBeenCalledTimes(1);
            expect(store.principalId).toBeNull();
            expect(store.identityGeneration).toBe(1);
        });

        scopedIt("clears twice when the same user logs out and back in", async () => {
            whoIsSequence({ id: 1 }, {}, { id: 1 });
            const store = storeUser();

            await store.fetchCurrentUser();
            await store.fetchCurrentUser();
            await store.fetchCurrentUser();

            // the anonymous state in between is always observed, so the comparison is on the value and
            // not on "a login happened"
            expect(clearAuthScopedStores).toHaveBeenCalledTimes(2);
            expect(store.identityGeneration).toBe(2);
        });

        scopedIt("clears when a different user logs in", async () => {
            whoIsSequence({ id: 1 }, { id: 2 });
            const store = storeUser();

            await store.fetchCurrentUser();
            await store.fetchCurrentUser();

            expect(clearAuthScopedStores).toHaveBeenCalledTimes(1);
            expect(store.principalId).toBe(2);
        });

        scopedIt("leaves the principal alone when who-is itself fails", async () => {
            getUrl.mockReturnValue("/current/");
            fetchHelper.mockResolvedValueOnce({ id: 1 });
            fetchHelper.mockRejectedValueOnce(new Error("network"));
            const store = storeUser();

            await store.fetchCurrentUser();
            await expect(store.fetchCurrentUser()).rejects.toThrow("network");

            expect(clearAuthScopedStores).not.toHaveBeenCalled();
            expect(store.principalId).toBe(1);
        });
    });
});
