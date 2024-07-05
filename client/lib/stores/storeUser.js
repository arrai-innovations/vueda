import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FormValidationError } from "@vueda/utils/errors.js";
import { getJsonOrText } from "@vueda/utils/fetchSupport.js";
import { getUrl } from "@vueda/utils/urls.js";
import { isObject } from "lodash-es";
import { defineStore } from "pinia";

/**
 * An error for from the user store.
 *
 * @param {string} messagePrefix - prefix for error messages
 * @param {Response} response - fetch response
 * @param {object} responseData - response data
 * @property {Response} response - fetch response
 * @property {object} responseData - response data
 */
class UserError extends Error {
    constructor(messagePrefix, response, responseData) {
        const message = [];
        message.push(messagePrefix);
        if (response?.status || response?.statusText) {
            message.push(": ");
            if (response?.status) {
                message.push(response.status);
            }
            if (response?.statusText) {
                if (response?.status) {
                    message.push(" ");
                }
                message.push(response.statusText);
            }
        }
        super(message);
        this.name = "UserError";
        this.response = response;
        this.responseData = responseData;
    }
}

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
 *   user.logout(); // logout
 *   user.fetchCurrentUser(); // fetch the current user
 * ```
 * @returns {import('pinia').Store<{
 *   loggedIn: boolean,
 *   loggedInUser: object,
 *   initialized: boolean,
 *   loading: boolean,
 *   error: Error|null,
 *   errored: boolean,
 *   initializingPromise: Promise<void>,
 *   fetchCurrentUser: () => Promise<void>,
 *   login: (payload: object) => Promise<void>,
 *   logout: () => Promise<void>,
 *   init: () => Promise<void>,
 * }>} The store for user.
 */
export default defineStore({
    id: "user",
    state: () => ({
        loggedIn: false,
        loggedInUser: {},
        initialized: undefined,
        loading: false,
        error: null,
        errored: false,
        initializingPromise: undefined,
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
                if (response.status === 400) {
                    // bad request
                    // return instead of throw, avoiding the local catch and not getting added to the error state
                    return Promise.reject(new FormValidationError(responseData));
                }
                throw new UserError("Unexpected authentication response", response, responseData);
            } catch (error) {
                this.error = error;
                this.errored = true;
                throw error;
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
        async init() {
            if (!this.initialized) {
                this.initialzingPromise = await this.fetchCurrentUser();
            }
            if (this.initializingPromise) {
                await this.initializingPromise;
            }
        },
    },
});
