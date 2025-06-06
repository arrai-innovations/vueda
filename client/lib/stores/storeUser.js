import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FetchError, FormValidationError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { getUrl } from "@vueda/utils/urls.js";
import isObject from "lodash-es/isObject.js";
import { defineStore } from "pinia";

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

/**
 * @typedef {import('pinia').Store<
 *   'user',
 *   {
 *       loggedIn: boolean,
 *       loggedInUser: object,
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
 *   import { storeUser } from "vueda-client";
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
    }),
    actions: {
        async fetchCurrentUser() {
            let response;
            if (this.initialized) {
                this.initialized = false;
            }
            this.loading = true;
            this.error = null;
            this.errored = false;
            try {
                try {
                    response = await fetch(`${httpOrHttpsHostname}${getUrl("userCurrentUser")}`, {
                        method: "GET",
                        credentials: "include",
                    });
                } catch (error) {
                    throw new UserError("Error requesting current user", error, {});
                }
                const responseData = await getJsonOrText(response);
                if (!response.ok || !isObject(responseData)) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new UserError("Unexpected current user response", response, responseData);
                }
                // non-logged in users still 200, just empty user.
                const user = responseData;
                this.loggedIn = !!user.id;
                this.loggedInUser = user;
            } catch (error) {
                this.error = error;
                this.errored = true;
                throw error;
            } finally {
                this.loading = false;
                if (!this.initialized) {
                    this.initialized = true;
                }
            }
        },
        async login(payload) {
            let response;
            this.loading = true;
            this.error = null;
            this.errored = false;
            try {
                try {
                    response = await fetch(`${httpOrHttpsHostname}${getUrl("userLogin")}`, {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": getCSRFValue(),
                            "Content-Type": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify(payload),
                    });
                } catch (error) {
                    throw new UserError("Error sending authentication request", error, {});
                }
                const responseData = await getJsonOrText(response);
                if (response.status === 204) {
                    // no content
                    return this.fetchCurrentUser();
                }
                let error;
                if (response.status === 400) {
                    // bad request
                    // return instead of throw, avoiding the local catch and not getting added to the error state
                    error = new FormValidationError(responseData, response);
                } else {
                    error = new UserError("Unexpected authentication response", response, responseData);
                }
                throw error;
            } catch (error) {
                this.error = error;
                this.errored = true;
                // throw error;
            } finally {
                this.loading = false;
            }
        },
        async logout() {
            if (!this.loggedIn) {
                // why call logout if you're not logged in?
                // confirm the user state
                await this.fetchCurrentUser();
                if (!this.loggedIn) {
                    return;
                }
            }
            let response;
            this.loading = true;
            this.error = null;
            this.errored = false;
            try {
                try {
                    response = await fetch(`${httpOrHttpsHostname}${getUrl("userLogout")}`, {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": getCSRFValue(),
                            "Content-Type": "application/json",
                        },
                        credentials: "include",
                    });
                } catch (error) {
                    throw new UserError("Error sending logout request", error, {});
                }
                const responseData = await getJsonOrText(response);
                if (response.status === 200) {
                    return this.fetchCurrentUser();
                }
                throw new UserError("Unexpected logout response", response, responseData);
            } catch (error) {
                this.error = error;
                this.errored = true;
                throw error;
            } finally {
                this.loading = false;
            }
        },
        async forgotPassword(payload) {
            let response;
            this.loading = true;
            this.error = null;
            this.errored = false;
            try {
                try {
                    response = await fetch(`${httpOrHttpsHostname}${getUrl("forgotPassword")}`, {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": getCSRFValue(),
                            "Content-Type": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify(payload),
                    });
                } catch (error) {
                    throw new UserError("Error sending authentication request", error, {});
                }
                const responseData = await getJsonOrText(response);
                if (response.status === 200) {
                    return responseData;
                }
                let error;
                if (response.status === 400) {
                    // bad request
                    // return instead of throw, avoiding the local catch and not getting added to the error state
                    error = new FormValidationError(responseData, response);
                } else {
                    error = new UserError("Unexpected error occurred", response, responseData);
                }
                throw error;
            } catch (error) {
                this.error = error;
                this.errored = true;
                // throw error;
            } finally {
                this.loading = false;
            }
        },
        async resetPassword(payload) {
            let response;
            this.loading = true;
            this.error = null;
            this.errored = false;
            try {
                try {
                    response = await fetch(`${httpOrHttpsHostname}${getUrl("resetPassword")}`, {
                        method: "POST",
                        headers: {
                            "X-CSRFToken": getCSRFValue(),
                            "Content-Type": "application/json",
                        },
                        credentials: "include",
                        body: JSON.stringify(payload),
                    });
                } catch (error) {
                    throw new UserError("Error sending authentication request", error, {});
                }
                const responseData = await getJsonOrText(response);
                if (response.status === 200) {
                    return responseData;
                }
                let error;
                if (response.status === 400) {
                    error = new FormValidationError(responseData, response);
                } else {
                    error = new UserError("Unexpected error occurred", response, responseData);
                }
                throw error;
            } catch (error) {
                this.error = error;
                this.errored = true;
            } finally {
                this.loading = false;
            }
        },
        async checkResetLinkIsValid(parmas) {
            let response;
            this.loading = true;
            this.error = null;
            this.errored = false;
            try {
                try {
                    const url = getUrl("isResetLinkValid").replace("{pk}", parmas.pk).replace("{token}", parmas.token);
                    response = await fetch(`${httpOrHttpsHostname}${url}`, {
                        method: "GET",
                        credentials: "include",
                    });
                } catch (error) {
                    throw new UserError("Error sending authentication request", error, {});
                }
                const responseData = await getJsonOrText(response);
                if (response.status === 200) {
                    return responseData;
                }
                let error;
                if (response.status === 400) {
                    error = new InvalidResetPasswordLinkError(responseData, response);
                } else {
                    error = new UserError("Unexpected error occurred", response, responseData);
                }
                throw error;
            } catch (error) {
                this.error = error;
                this.errored = true;
            } finally {
                this.loading = false;
            }
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
