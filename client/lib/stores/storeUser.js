/**
 * @module stores/storeUser
 * @description Pinia store for managing authentication state, including login, logout, password reset, and two-factor auth.
 */
import { clearAuthScopedStores } from "@vueda/stores/authScope.js";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { fetchHelper } from "@vueda/utils/fetchSupport.js";
import { getUrl } from "@vueda/utils/urls.js";
import { defineStore, getActivePinia } from "pinia";

const REAUTHENTICATION_FLOW_IDS = ["reauthenticate", "mfa_reauthenticate"];

/**
 * Pick the flow a 401 response asks the client to continue: the one allauth marks `is_pending`, or, for a
 * signed-in user whose session needs reauthentication, the first reauthentication flow. Other listed flows
 * are only available, not pending.
 *
 * @param {{id: string, is_pending?: boolean}[]} flows
 * @returns {{id: string, is_pending?: boolean}|null}
 */
function selectPendingFlow(flows) {
    return (
        flows.find((flow) => flow.is_pending) ??
        flows.find((flow) => REAUTHENTICATION_FLOW_IDS.includes(flow.id)) ??
        null
    );
}

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
    return new UserError("Unexpected error occurred", response, data);
};
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
 *   user.initialized; // reactive boolean for initialization state, true if initialized
 *   user.loading; // reactive boolean for loading state, true if loading
 *   user.error; // reactive object for error details
 *   user.errored; // reactive boolean for error state, true if errored
 *   user.initializingPromise; // promise for initialization
 *
 *   user.init(); // fetch the current user, with initialization wrapping
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
         * The last who-is response: the user's `id`, `email`, `name`, `totp_devices`, and `recently_logged_in`.
         * An empty object before the first response; an anonymous response carries no `id`.
         *
         * @type {{[key: string]: *}}
         */
        loggedInUser: {},
        /**
         * Whether the first who-is request has finished. `undefined` before any request, and `false` while a refetch runs.
         *
         * @type {boolean|undefined}
         */
        initialized: undefined,
        /**
         * Whether a request made by this store is in flight.
         *
         * @type {boolean}
         */
        loading: false,
        /**
         * The error from the last failed request, or `null` when the last request succeeded or was cleared.
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
         * The who-is request that `init` started, so concurrent `init` calls wait on the same request.
         *
         * @type {Promise<void>|null}
         */
        initializingPromise: null,
        /**
         * The `recently_logged_in` flag from the last who-is response.
         * Route guards use it to ask for reauthentication before sensitive pages.
         *
         * @type {boolean|null}
         */
        recentlyLoggedIn: false,
        /**
         * The allauth flow that a 401 response asks the client to continue, such as `mfa_authenticate` or `reauthenticate`.
         * `null` when no flow is pending.
         *
         * @type {{id: string, is_pending?: boolean}|null}
         */
        pendingFlow: null,
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
         * Fetches the current user from the who-is endpoint and updates the login state.
         * When the authenticated user changes, clears the authorization-dependent stores and increments `identityGeneration`.
         *
         * @param {object} [options={}] - Fetch options.
         * @param {boolean} [options.preserveError=false] - Whether to leave `error` and `errored` unchanged, on success and on failure.
         * @returns {Promise<void>} Resolves once the state is updated; rejects with the request error.
         */
        fetchCurrentUser({ preserveError = false } = {}) {
            // Captured synchronously, because the success handler below runs after an await and the
            // module-level active instance can belong to another Pinia by then.
            const pinia = getActivePinia();
            if (this.initialized) {
                this.initialized = false;
            }
            this.loading = true;
            if (!preserveError) {
                this.error = null;
                this.errored = false;
            }

            return fetchHelper(
                `${httpOrHttpsHostname}${getUrl("userCurrentUser")}`,
                { method: "GET" },
                "Error requesting current user",
                UserError,
            )
                .then((user) => {
                    // non-logged in users still 200, just empty user.
                    const nextPrincipalId = user?.id ?? null;
                    const previousPrincipalId = this.principalId;
                    this.loggedIn = !!user.id;
                    this.recentlyLoggedIn = user.recently_logged_in;
                    this.loggedInUser = user;
                    this.principalId = nextPrincipalId;
                    // Every path that can change who is authenticated (login, logout, reauthenticate,
                    // two-factor, TOTP activation, init) funnels through here, so this is the one place
                    // that has to notice. Compare the principal only: `recently_logged_in` flips on
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
                    if (!preserveError) {
                        this.error = error;
                        this.errored = true;
                    }
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                    if (!this.initialized) {
                        this.initialized = true;
                    }
                });
        },
        /**
         * Signs the user in, then refetches the current user.
         * When the server answers with a pending flow, such as two-factor authentication, sets `pendingFlow` and resolves instead of rejecting.
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
            this.pendingFlow = null;

            return fetchHelper(
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
                UserError,
                undefined,
                undefined,
                authErrorResolver,
            )
                .then(() => {
                    return this.fetchCurrentUser();
                })
                .catch((error) => {
                    this._handle_error(error);
                    if (!this.pendingFlow) {
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
            this.pendingFlow = null;

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
         * Confirms the signed-in user's password again, clears `pendingFlow`, then refetches the current user.
         *
         * @param {object} payload - The credentials to send.
         * @param {string} payload.password - The user's password.
         * @returns {Promise<void>}
         */
        reauthenticate(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            return fetchHelper(
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
                UserError,
                undefined,
                undefined,
                authErrorResolver,
            )
                .then(() => {
                    this.pendingFlow = null;
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

            return fetchHelper(
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
                UserError,
                undefined,
                undefined,
                authErrorResolver,
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

            return fetchHelper(
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
                UserError,
                undefined,
                undefined,
                authErrorResolver,
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
         * Handles an `UnauthorizedError` by setting `pendingFlow` from the flows the response lists, then refetching the current user.
         * The refetch keeps the existing error and ignores its own failure. Other errors are ignored.
         *
         * @param {Error} error - The error from a failed request.
         * @returns {Promise<void>|undefined} The refetch promise for an `UnauthorizedError`, otherwise `undefined`.
         */
        _handle_error(error) {
            if (error instanceof UnauthorizedError) {
                const flows = error.responseData?.data?.flows;
                if (flows && flows.length > 0) {
                    this.pendingFlow = selectPendingFlow(flows);
                }
                return this.fetchCurrentUser({ preserveError: true }).catch(() => undefined);
            }
        },
        /**
         * Starts setting up a two-factor device for the signed-in user.
         * For `email` and `sms`, the server sends a code to the destination; for `totp`, it returns the secret and a QR code.
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

            return fetchHelper(
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
                UserError,
                undefined,
                undefined,
                authErrorResolver,
            )
                .then((responseData) => {
                    return responseData;
                })
                .catch((error) => {
                    this.error = error;
                    this.errored = true;
                    this._handle_error(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Activates the device that `setupTOTPDevice` started, then refetches the current user to pick up its devices.
         *
         * @param {object} payload - The request body.
         * @param {string} payload.code - The code from the device.
         * @returns {Promise<void>}
         */
        activateTOTPDevice(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            return fetchHelper(
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
                UserError,
                undefined,
                undefined,
                authErrorResolver,
            )
                .then(() => {
                    // Refresh user totp device data
                    return this.fetchCurrentUser();
                })
                .catch((error) => {
                    this.error = error;
                    this.errored = true;
                    this._handle_error(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Completes a two-factor sign-in with a code, clears `pendingFlow`, then refetches the current user.
         *
         * @param {object} payload - The request body.
         * @param {string} payload.code - The code from the user's device.
         * @returns {Promise<void>}
         */
        twoFactorAuthenticate(payload) {
            this.loading = true;
            this.error = null;
            this.errored = false;

            return fetchHelper(
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
                UserError,
                undefined,
                undefined,
                authErrorResolver,
            )
                .then(() => {
                    this.pendingFlow = null;
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

            return fetchHelper(
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
                UserError,
                undefined,
                undefined,
                authErrorResolver,
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
         * Fetches the two-factor methods of the user who is signing in.
         *
         * @returns {Promise<{[key: string]: *}|string|undefined>} An object whose `methods` lists the device methods, such as `totp`, `email`, or `sms`.
         */
        getTwoFactorAuthMethod() {
            this.loading = true;
            this.error = null;
            this.errored = false;

            const url = getUrl("getTOTPCode");

            return fetchHelper(
                `${httpOrHttpsHostname}${url}`,
                { method: "GET" },
                "Error sending authentication request",
                UserError,
                undefined,
                undefined,
                authErrorResolver,
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
         * Asks the server to send a two-factor code to the signing-in user's device for the given method.
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
            return fetchHelper(
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
                UserError,
                undefined,
                undefined,
                authErrorResolver,
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
         * Generates a new set of recovery codes for the signed-in user, replacing any existing set.
         *
         * @returns {Promise<{[key: string]: *}|string|undefined>} The allauth response, whose `data.unused_codes` lists the new codes.
         */
        generateRecoveryCode() {
            this.loading = true;
            this.error = null;
            this.errored = false;

            const url = getUrl("recoveryCodes");

            return fetchHelper(
                `${httpOrHttpsHostname}${url}`,
                {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                },
                "Error sending authentication request",
                UserError,
                undefined,
                undefined,
                authErrorResolver,
            )
                .then((responseData) => {
                    return responseData;
                })
                .catch((error) => {
                    this.error = error;
                    this.errored = true;
                    this._handle_error(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Fetches the signed-in user's recovery codes, and generates them when the user has none.
         *
         * @returns {Promise<{[key: string]: *}|string|undefined>} The allauth response, whose `data.unused_codes` lists the unused codes.
         */
        getRecoveryCodes() {
            this.loading = true;
            this.error = null;
            this.errored = false;

            const url = getUrl("recoveryCodes");

            return fetchHelper(
                `${httpOrHttpsHostname}${url}`,
                { method: "GET" },
                "Error sending authentication request",
                UserError,
                undefined,
                undefined,
                authErrorResolver,
            )
                .then((responseData) => {
                    return responseData;
                })
                .catch((error) => {
                    if (error.response?.status === 404) {
                        return this.generateRecoveryCode();
                    }
                    this.error = error;
                    this.errored = true;
                    this._handle_error(error);
                    throw error;
                })
                .finally(() => {
                    this.loading = false;
                });
        },
        /**
         * Fetches the current user once, and waits for that request on later calls.
         *
         * @returns {Promise<void>}
         */
        async init() {
            if (!this.initialized) {
                this.initializingPromise = this.fetchCurrentUser();
            }
            if (this.initializingPromise) {
                await this.initializingPromise;
            }
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
