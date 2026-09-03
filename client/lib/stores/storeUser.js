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
 * @typedef {import('pinia').Store<
 *   'user',
 *   {
 *       loggedIn: boolean,
 *       loggedInUser: object,
 *       principalId: (string|number|null|undefined),
 *       identityGeneration: number,
 *       initialized: boolean|undefined,
 *       loading: boolean,
 *       error: Error|null,
 *       errored: boolean,
 *       initializingPromise: Promise<void>|null,
 *   },
 *   {},
 *   {
 *       fetchCurrentUser: () => Promise<void>,
 *       login: (payload: object) => Promise<void>,
 *       logout: () => Promise<void>,
 *       forgotPassword: () => Promise<void>,
 *       resetPassword: () => Promise<void>,
 *       checkResetLinkIsValid: () => Promise<void>,
 *       init: () => Promise<void>,
 *       clearError: () => void,
 *   },
 * >} UserStore
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
 * @returns {UserStore} The store for user.
 */
export const storeUser = defineStore("user", {
    state: () => ({
        loggedIn: false,
        loggedInUser: {},
        /** @type {boolean|undefined} */
        initialized: undefined,
        loading: false,
        error: null,
        errored: false,
        /** @type {Promise<void>|null} */
        initializingPromise: null,
        recentlyLoggedIn: false,
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
        _handle_error(error) {
            if (error instanceof UnauthorizedError) {
                const flows = error.responseData?.data?.flows;
                if (flows && flows.length > 0) {
                    this.pendingFlow = flows.at(-1);
                }
                return this.fetchCurrentUser({ preserveError: true }).catch(() => undefined);
            }
        },
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
                        return new InvalidResetPasswordLinkError(response, data);
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
        async init() {
            if (!this.initialized) {
                this.initializingPromise = this.fetchCurrentUser();
            }
            if (this.initializingPromise) {
                await this.initializingPromise;
            }
        },
        clearError() {
            this.error = null;
            this.errored = false;
        },
    },
});
