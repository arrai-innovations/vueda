/**
 * @module stores/storeUser
 * @description Pinia store for managing authentication state, including login, logout, password reset, and two-factor auth.
 */
import { clearAuthScopedStores } from "@vueda/stores/authScope.js";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError, FormValidationError, RateLimitedError } from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
import { getUrl } from "@vueda/utils/urls.js";
import { defineStore, getActivePinia } from "pinia";

/**
 * An error for use from the user store.
 * @extends {FetchError}
 */
class UserError extends FetchError {
    /**
     * Creates an instance of UserError.
     * @param {string} messagePrefix - The prefix for the error message.
     * @param {Response} [response] - The response object associated with the error.
     * @param {object|string} [responseData] - The data returned in the response.
     */
    constructor(messagePrefix, response, responseData) {
        super(messagePrefix, response, responseData);
        this.name = "UserError";
    }
}
export class InvalidResetPasswordLinkError extends FetchError {
    /**
     * Creates an instance of InvalidResetPasswordLinkError.
     * @param {string} messagePrefix - The prefix for the error message.
     * @param {Response} [response] - The response object associated with the error.
     * @param {object|string} [responseData] - The data returned in the response.
     */
    constructor(messagePrefix, response, responseData) {
        super(messagePrefix, response, responseData);
        this.name = "InvalidResetPasswordLinkError";
    }
}
export class UnauthorizedError extends FetchError {
    /**
     * Creates an instance of UnauthorizedError.
     * @param {string} messagePrefix - The prefix for the error message.
     * @param {Response} [response] - The response object associated with the error.
     * @param {object|string} [responseData] - The data returned in the response.
     */
    constructor(messagePrefix, response, responseData) {
        super(messagePrefix, response, responseData);
        this.name = "UnauthorizedError";
    }
}

const authErrorResolver = (response, data) => {
    if (response.status === 400) {
        return new FormValidationError(data, response);
    }
    if (response.status === 401 || response.status === 403) {
        return new UnauthorizedError("Unauthorized", response, data);
    }
    if (response.status === 429) {
        return new RateLimitedError("Too many requests", response, data);
    }
    return new UserError("Unexpected error occurred", response, data);
};

/**
 * Sends a request for the user store. A failed response rejects with the error that `errorResolver` builds.
 *
 * @param {string} url - The URL to request.
 * @param {RequestInit} init - The fetch options.
 * @param {string} messagePrefix - The prefix for the error message.
 * @param {(response: Response, data: *) => Error} [errorResolver=authErrorResolver] - Builds the error for a
 *  failed response. A custom resolver handles its own statuses and passes the rest to `authErrorResolver`.
 * @returns {Promise<*>} The decoded response data.
 */
const userFetch = (url, init, messagePrefix, errorResolver = authErrorResolver) =>
    fetchHelper(url, init, messagePrefix, UserError, undefined, undefined, errorResolver);
/**
 * @typedef {ReturnType<typeof storeUser>} UserStore
 */

/**
 * The user store, handling user login, logout, and current user fetching.
 *
 * @example
 * ```js
 *   import { storeUser } from "@vueda";
 *   const user = storeUser();
 *
 *   user.loggedIn; // reactive boolean for login state, true if logged-in
 *   user.loggedInUser; // reactive object for user details
 *   user.currentUserRequestStatus.loading; // undefined before the first request, true while one runs, then false
 *   user.currentUserRequestStatus.error; // error from the last current-user request, null when it succeeded
 *   user.currentUserRequestStatus.errored; // true when the last current-user request failed
 *   user.loading; // reactive boolean for loading state, true if loading
 *   user.error; // reactive object for error details
 *   user.errored; // reactive boolean for error state, true if errored
 *
 *   user.login({username: "username", password: "password"}); // login
 *   user.forgotPassword({email: "password"}); /
 *   user.resetPassword({password: "password", password_confirm: "password_confirm"});
 *   user.checkResetLinkIsValid(); // login
 *   user.logout(); // logout
 *   user.fetchCurrentUser(); // fetch the current user
 * ```
 */
export const storeUser = defineStore("user", {
    state: () => ({
        /**
         * Whether the last who-is response named an authenticated user.
         *
         * @type {boolean}
         */
        loggedIn: false,
        /**
         * The last who-is response: the user's `id`, `email`, `name`, `totp_devices`, and `auth_pending_flow`.
         * An empty object before the first response; an anonymous response carries no `id`, only
         * `auth_pending_flow`.
         *
         * @type {{[key: string]: *}}
         */
        loggedInUser: {},
        /**
         * The status of the newest current-user request, which `fetchCurrentUser` sends to the who-is endpoint.
         * It has the `useLoadingError` shape from reactive-helpers.
         * Only `fetchCurrentUser` writes it, so the other actions never change it.
         *
         * - `loading` is `undefined` before the first request, `true` while a request runs, and `false` once
         *   it finishes.
         * - `error` holds the error from the finished request. It is `null` when the request succeeded.
         * - `errored` is `true` when the finished request failed.
         *
         * The last current-user request succeeded when `loading` is `false` and `errored` is `false`.
         *
         * @type {{loading: boolean|undefined, error: Error|null, errored: boolean}}
         */
        currentUserRequestStatus: {
            loading: undefined,
            error: null,
            errored: false,
        },
        /**
         * The promise of the newest current-user request, so callers can wait for a request in flight instead of
         * starting another. It settles with the newest request's outcome. The value is `null` before the
         * first request.
         *
         * @type {Promise<void>|null}
         */
        currentUserRequest: null,
        /**
         * Whether a request made by this store is in flight.
         *
         * @type {boolean}
         */
        loading: false,
        /**
         * The error from the last failed request. The value is `null` when the last request succeeded or
         * was cleared.
         *
         * @type {Error|null}
         */
        error: null,
        /**
         * Whether `error` holds an error from the last failed request.
         *
         * @type {boolean}
         */
        errored: false,
        /**
         * The allauth flow the user must complete next, or `null` when none is pending.
         *
         * Each who-is response sets it from `auth_pending_flow`, including the refetch that follows a 401
         * response. For an anonymous session it is the stage a sign-in waits at, such as
         * `mfa_authenticate`, so a reload mid-sign-in resumes the two-factor step. For a signed-in user it is
         * `mfa_reauthenticate` when they must confirm a second factor, `reauthenticate` when they must confirm
         * their password, and `null` while their session is recent. A signed-in user with no pending flow has
         * recently authenticated, which is what the `requireRecentAuth` guard checks.
         * The reauthentication view renders the input for the flow and calls `twoFactorReauthenticate` or
         * `reauthenticate` to complete it.
         *
         * @type {string|null}
         */
        authPendingFlow: null,
        /**
         * The id of the authenticated user, `null` while nobody is authenticated, and `undefined`
         * until the first who-is response has been seen. The `undefined` sentinel is what keeps the
         * first who-is from counting as a change of user.
         *
         * @type {string|number|null|undefined}
         */
        principalId: undefined,
        /**
         * Incremented once per change of authenticated user, after the authorization-dependent
         * caches have been dropped. Watch it to rebuild anything derived from those caches.
         *
         * @type {number}
         */
        identityGeneration: 0,
    }),
    actions: {
        /**
         * Fetches the current user from the who-is endpoint and updates the login state and `currentUserRequestStatus`.
         * When the authenticated user changes, clears the authorization-dependent stores and increments `identityGeneration`.
         *
         * Only the newest request writes the user fields and `currentUserRequestStatus`. The promise of an older
         * request settles with the newest request's outcome, so a caller that awaits it reads the newest answer.
         *
         * @param {object} [options={}] - Fetch options.
         * @param {boolean} [options.preserveError=false] - Whether to leave the store-wide `error` and `errored`
         *  unchanged, on success and on failure. `currentUserRequestStatus` records the outcome either way.
         * @returns {Promise<void>} Resolves once the state is updated; rejects with the request error.
         */
        fetchCurrentUser({ preserveError = false } = {}) {
            // Captured synchronously, because the success handler below runs after an await and the
            // module-level active instance can belong to another Pinia by then.
            const pinia = getActivePinia();
            this.loading = true;
            this.currentUserRequestStatus.loading = true;
            this.currentUserRequestStatus.error = null;
            this.currentUserRequestStatus.errored = false;
            if (!preserveError) {
                this.error = null;
                this.errored = false;
            }

            const request = fetchHelper(
                `${httpOrHttpsHostname}${getUrl("userCurrentUser")}`,
                { method: "GET" },
                "Error requesting current user",
                UserError,
            )
                .then((user) => {
                    // A newer request has started since this one, so its answer is the current one.
                    if (this.currentUserRequest !== request) {
                        return this.currentUserRequest;
                    }
                    // non-logged in users still 200, just empty user.
                    const nextPrincipalId = user?.id ?? null;
                    const previousPrincipalId = this.principalId;
                    this.loggedIn = !!user.id;
                    this.authPendingFlow = user.auth_pending_flow ?? null;
                    this.loggedInUser = user;
                    this.principalId = nextPrincipalId;
                    // Every path that can change who is authenticated (login, logout, reauthenticate,
                    // two-factor, TOTP activation, route guards) funnels through here, so this is the one place
                    // that has to notice. Compare the principal only: `auth_pending_flow` changes on
                    // reauthenticate and `totp_devices` changes on device activation, neither of which
                    // changes what the user is permitted to see.
                    if (previousPrincipalId !== undefined && previousPrincipalId !== nextPrincipalId) {
                        // Includes the change to nobody: the library has no call site for `logout`, so
                        // it cannot assume the application navigates away from the cached data.
                        this.identityGeneration += 1;
                        clearAuthScopedStores(pinia);
                    }
                })
                .catch((error) => {
                    if (this.currentUserRequest !== request) {
                        return this.currentUserRequest;
                    }
                    this.currentUserRequestStatus.error = error;
                    this.currentUserRequestStatus.errored = true;
                    if (!preserveError) {
                        this.error = error;
                        this.errored = true;
                    }
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                    if (this.currentUserRequest === request) {
                        this.currentUserRequestStatus.loading = false;
                    }
                });
            this.currentUserRequest = request;
            return request;
        },
        /**
         * Signs the user in, then refetches the current user.
         * When the server answers with a pending flow, such as two-factor authentication, the refetch sets `authPendingFlow` and the call resolves instead of rejecting.
         *
         * @param {object} payload - The credentials to send.
         * @param {string} payload.email - The user's email address.
         * @param {string} payload.password - The user's password.
         * @returns {Promise<void>} Resolves when signed in or a flow is pending; rejects with the request error otherwise.
         */
        login(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;
            this.authPendingFlow = null;

            return userFetch(
                `${httpOrHttpsHostname}${getUrl("userLogin")}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
                "Error sending authentication request",
            )
                .then(() => {
                    return this.fetchCurrentUser();
                })
                .catch(async (error) => {
                    await this._refetchUserOnUnauthorized(error);
                    if (!this.authPendingFlow) {
                        this.error = error;
                        this.errored = true;
                        throw error;
                    }
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Signs the user out, then refetches the current user.
         * When the store does not think the user is signed in, refetches first and skips the request if the server agrees.
         *
         * @returns {Promise<void>}
         */
        logout() {
            if (!this.loggedIn) {
                return this.fetchCurrentUser().then(() => {
                    if (!this.loggedIn) {
                        return Promise.resolve();
                    }
                    return this._performLogout();
                });
            }
            return this._performLogout();
        },
        /**
         * Sends the logout request, then refetches the current user. `logout` calls this.
         *
         * @returns {Promise<void>}
         */
        _performLogout() {
            this.loading = true;
            this.error = null;
            this.errored = false;
            this.authPendingFlow = null;

            return fetchHelper(
                `${httpOrHttpsHostname}${getUrl("userLogout")}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                },
                "Error sending logout request",
                UserError,
            )
                .then(() => {
                    return this.fetchCurrentUser();
                })
                .catch((error) => {
                    this.error = error;
                    this.errored = true;
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Confirms the signed-in user's password again, then refetches the current user, which clears `authPendingFlow`.
         * Before rejecting with an `UnauthorizedError`, refetches the current user, so `authPendingFlow` names the flow
         * that the server now requires.
         *
         * Completes the `reauthenticate` flow. The server does not count a password confirmation for a user with a
         * two-factor device; their flow is `mfa_reauthenticate`, which `twoFactorReauthenticate` completes.
         *
         * @param {object} payload - The credentials to send.
         * @param {string} payload.password - The user's password.
         * @returns {Promise<void>}
         */
        reauthenticate(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            return userFetch(
                `${httpOrHttpsHostname}${getUrl("reauthenticate")}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
                "Error sending authentication request",
            )
                .then(() => {
                    return this.fetchCurrentUser();
                })
                .catch(async (error) => {
                    this.error = error;
                    this.errored = true;
                    await this._refetchUserOnUnauthorized(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Asks the server to email a password reset link.
         *
         * @param {object} payload - The request body.
         * @param {string} payload.email - The email address of the account to reset.
         * @returns {Promise<{[key: string]: *}|string|undefined>} The decoded response data.
         */
        forgotPassword(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            return userFetch(
                `${httpOrHttpsHostname}${getUrl("forgotPassword")}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
                "Error sending authentication request",
            )
                .then((responseData) => {
                    return responseData;
                })
                .catch((error) => {
                    this.error = error;
                    this.errored = true;
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Changes the signed-in user's password.
         *
         * @param {object} payload - The request body.
         * @param {string} payload.old_password - The current password.
         * @param {string} payload.new_password1 - The new password.
         * @param {string} payload.new_password2 - The new password again, for confirmation.
         * @returns {Promise<{[key: string]: *}|string|undefined>} The decoded response data.
         */
        changePassword(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            return userFetch(
                `${httpOrHttpsHostname}${getUrl("changePassword")}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
                "Error sending authentication request",
            )
                .catch((error) => {
                    this.error = error;
                    this.errored = true;
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Refetches the current user when `error` is an `UnauthorizedError`, so `authPendingFlow` names the flow that
         * the server now requires. A request guarded by an auth flow, such as a pending sign-in or recent
         * authentication, answers 401 when that flow has changed. The refetch keeps the existing error and ignores
         * its own failure. Other errors are ignored.
         *
         * @param {Error} error - The error from a failed request.
         * @returns {Promise<void>|undefined} The refetch promise for an `UnauthorizedError`, otherwise `undefined`.
         */
        _refetchUserOnUnauthorized(error) {
            if (error instanceof UnauthorizedError) {
                return this.fetchCurrentUser({ preserveError: true }).catch(() => undefined);
            }
        },
        /**
         * Starts setting up a two-factor device for the signed-in user.
         * For `email` and `sms`, the server sends a code to the destination; for `totp`, it returns the secret and a QR code.
         * Before rejecting with an `UnauthorizedError`, refetches the current user, so `authPendingFlow` names the flow
         * that the server now requires.
         *
         * @param {object} payload - The request body.
         * @param {string} payload.method - The device method: `totp`, `email`, or `sms`.
         * @param {string} [payload.destination] - The email address or phone number; required for `email` and `sms`.
         * @returns {Promise<{[key: string]: *}|string|undefined>} For `totp`, an object whose `meta` holds `totp_secret` and `totp_svg_data_uri`.
         */
        setupTOTPDevice(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            return userFetch(
                `${httpOrHttpsHostname}${getUrl("setupTOTPDevice")}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
                "Error sending authentication request",
            )
                .then((responseData) => {
                    return responseData;
                })
                .catch(async (error) => {
                    this.error = error;
                    this.errored = true;
                    await this._refetchUserOnUnauthorized(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Activates the device that `setupTOTPDevice` started, then refetches the current user to pick up its devices.
         * Before rejecting with an `UnauthorizedError`, refetches the current user, so `authPendingFlow` names the flow
         * that the server now requires.
         *
         * @param {object} payload - The request body.
         * @param {string} payload.code - The code from the device.
         * @returns {Promise<void>}
         */
        activateTOTPDevice(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            return userFetch(
                `${httpOrHttpsHostname}${getUrl("activateTOTPDevice")}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
                "Error sending authentication request",
            )
                .then(() => {
                    // Refresh user totp device data
                    return this.fetchCurrentUser();
                })
                .catch(async (error) => {
                    this.error = error;
                    this.errored = true;
                    await this._refetchUserOnUnauthorized(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Completes a two-factor sign-in with a code, then refetches the current user, which clears `authPendingFlow`.
         * Before rejecting with an `UnauthorizedError`, refetches the current user, so `authPendingFlow` names the flow
         * that the server now requires.
         *
         * @param {object} payload - The request body.
         * @param {string} payload.code - The code from the user's device.
         * @returns {Promise<void>}
         */
        twoFactorAuthenticate(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            return userFetch(
                `${httpOrHttpsHostname}${getUrl("twoFactorAuthenticate")}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
                "Error sending authentication request",
            )
                .then(() => {
                    return this.fetchCurrentUser();
                })
                .catch(async (error) => {
                    this.error = error;
                    this.errored = true;
                    await this._refetchUserOnUnauthorized(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Confirms the signed-in user's second factor with a code, then refetches the current user, which clears `authPendingFlow`.
         * Before rejecting with an `UnauthorizedError`, refetches the current user, so `authPendingFlow` names the flow
         * that the server now requires.
         *
         * Completes the `mfa_reauthenticate` flow, which the server requires from a user with a two-factor device
         * before a reauthentication-guarded action.
         *
         * @param {object} payload - The request body.
         * @param {string} payload.code - The code from the user's device, or a recovery code.
         * @returns {Promise<void>}
         */
        twoFactorReauthenticate(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            return userFetch(
                `${httpOrHttpsHostname}${getUrl("twoFactorReauthenticate")}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
                "Error sending authentication request",
            )
                .then(() => {
                    return this.fetchCurrentUser();
                })
                .catch(async (error) => {
                    this.error = error;
                    this.errored = true;
                    await this._refetchUserOnUnauthorized(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Sets a new password using the `pk` and `token` from a password reset link.
         *
         * @param {object} payload - The request body.
         * @param {string} payload.password - The new password.
         * @param {string} payload.password_confirm - The new password again, for confirmation.
         * @param {string} payload.pk - The encoded user id from the reset link.
         * @param {string} payload.token - The reset token from the reset link.
         * @returns {Promise<{[key: string]: *}|string|undefined>} The decoded response data; `undefined` on success.
         */
        resetPassword(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            return userFetch(
                `${httpOrHttpsHostname}${getUrl("resetPassword")}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
                "Error sending authentication request",
            )
                .then((responseData) => {
                    return responseData;
                })
                .catch((error) => {
                    this.error = error;
                    this.errored = true;
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Checks with the server whether a password reset link is still valid.
         * Rejects with `InvalidResetPasswordLinkError` when the server answers 400.
         *
         * @param {object} params - The values from the reset link.
         * @param {string} params.pk - The encoded user id.
         * @param {string} params.token - The reset token.
         * @returns {Promise<{[key: string]: *}|string|undefined>} The decoded response data, with a `detail` message.
         */
        checkResetLinkIsValid(params) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            const url = getUrl("isResetLinkValid").replace("{pk}", params.pk).replace("{token}", params.token);

            return fetchHelper(
                `${httpOrHttpsHostname}${url}`,
                { method: "GET" },
                "Error sending authentication request",
                UserError,
                undefined,
                undefined,
                (response, data) => {
                    if (response.status === 400) {
                        return new InvalidResetPasswordLinkError("Invalid password reset link", response, data);
                    }
                    return new UserError("Unexpected error occurred", response, data);
                },
            )
                .then((responseData) => {
                    return responseData;
                })
                .catch((error) => {
                    this.error = error;
                    this.errored = true;
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Fetches the two-factor methods of the user who is signing in or reauthenticating.
         * Before rejecting with an `UnauthorizedError`, refetches the current user, so `authPendingFlow` names the flow
         * that the server now requires.
         *
         * @returns {Promise<{[key: string]: *}|string|undefined>} An object whose `methods` lists the device methods, such as `totp`, `email`, or `sms`.
         */
        getTwoFactorAuthMethod() {
            this.loading = true;
            this.error = null;
            this.errored = false;

            const url = getUrl("getTOTPCode");

            return userFetch(`${httpOrHttpsHostname}${url}`, { method: "GET" }, "Error sending authentication request")
                .then((responseData) => {
                    return responseData;
                })
                .catch(async (error) => {
                    this.error = error;
                    this.errored = true;
                    await this._refetchUserOnUnauthorized(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Asks the server to send a two-factor code to the device of the user who is signing in or
         * reauthenticating, for the given method.
         * Before rejecting with an `UnauthorizedError`, refetches the current user, so `authPendingFlow` names the flow
         * that the server now requires.
         *
         * @param {object} payload - The request body.
         * @param {string} payload.method - The delivery method: `email` or `sms`.
         * @returns {Promise<{[key: string]: *}|string|undefined>} The decoded response data; `undefined` on success.
         */
        sendTwoFactorAuthenticationCode(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;
            const url = getUrl("getTOTPCode");
            return userFetch(
                `${httpOrHttpsHostname}${url}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
                "Error sending authentication request",
            )
                .then((responseData) => {
                    return responseData;
                })
                .catch(async (error) => {
                    this.error = error;
                    this.errored = true;
                    await this._refetchUserOnUnauthorized(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Generates a new set of recovery codes for the signed-in user, replacing any existing set.
         * Before rejecting with an `UnauthorizedError`, refetches the current user, so `authPendingFlow` names the flow
         * that the server now requires.
         *
         * @returns {Promise<{[key: string]: *}|string|undefined>} The allauth response, whose `data.unused_codes` lists the new codes.
         */
        generateRecoveryCode() {
            this.loading = true;
            this.error = null;
            this.errored = false;

            const url = getUrl("recoveryCodes");

            return userFetch(
                `${httpOrHttpsHostname}${url}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                },
                "Error sending authentication request",
            )
                .then((responseData) => {
                    return responseData;
                })
                .catch(async (error) => {
                    this.error = error;
                    this.errored = true;
                    await this._refetchUserOnUnauthorized(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Fetches the signed-in user's recovery codes, and generates them when the user has none.
         * Before rejecting with an `UnauthorizedError`, refetches the current user, so `authPendingFlow` names the flow
         * that the server now requires.
         *
         * @returns {Promise<{[key: string]: *}|string|undefined>} The allauth response, whose `data.unused_codes` lists the unused codes.
         */
        getRecoveryCodes() {
            this.loading = true;
            this.error = null;
            this.errored = false;

            const url = getUrl("recoveryCodes");

            return userFetch(`${httpOrHttpsHostname}${url}`, { method: "GET" }, "Error sending authentication request")
                .then((responseData) => {
                    return responseData;
                })
                .catch(async (error) => {
                    if (error.response?.status === 404) {
                        return this.generateRecoveryCode();
                    }
                    this.error = error;
                    this.errored = true;
                    await this._refetchUserOnUnauthorized(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Clears `error` and `errored`.
         *
         * @returns {void}
         */
        clearError() {
            this.error = null;
            this.errored = false;
        },
    },
});
