import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FormValidationError } from "@vueda/utils/errors.js";
import { getUrl } from "@vueda/utils/urls.js";
import { defineStore } from "pinia";

class UserError extends Error {
    constructor(messagePrefix, response) {
        const message = `${messagePrefix}: ${response.status} ${response.statusText}`;
        super(message);
        this.name = "UserError";
        this.response = response;
    }
}

function checkForTypeError(error) {
    if (error instanceof TypeError) {
        // this is probably a network error
        error.response = {
            text: async () => {
                return "This is probably a network error.";
            },
        };
    }
}

/**
 * storeUser - pinia store for user state
 * Usage:
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
 *   user.whoAmI(); // fetch the current user
 * ```
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
        async whoAmI() {
            if (this.initialized) {
                this.initialized = false;
            }
            try {
                const response = await fetch(`${httpOrHttpsHostname}/${getUrl("userCurrentUser")}/`, {
                    method: "GET",
                    credentials: "include",
                });
                if (!response.ok) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new UserError("Failed to get current user", response);
                }
                // non-logged in users still 200, just empty user.
                const user = await response.json();
                this.loggedIn = !!user.id;
                this.loggedInUser = user;
            } catch (error) {
                checkForTypeError(error);
                throw error;
            } finally {
                this.initialized = true;
            }
        },
        async login(payload) {
            let response;
            try {
                response = await fetch(`${httpOrHttpsHostname}/${getUrl("userLogin")}/`, {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify(payload),
                });
                if (response.status === 204) {
                    return this.whoAmI();
                }
                if (response.status === 400) {
                    const data = await response.json();
                    return Promise.reject(new FormValidationError(data));
                }
            } catch (error) {
                checkForTypeError(error);
                throw error;
            }
            throw new UserError("Failed to login", response);
        },
        async logout() {
            if (!this.loggedIn) {
                // why call logout if you're not logged in?
                // confirm the user state
                await this.whoAmI();
                if (!this.loggedIn) {
                    return;
                }
            }
            let response;
            try {
                response = await fetch(`${httpOrHttpsHostname}/${getUrl("userLogout")}/`, {
                    method: "POST",
                    headers: {
                        "X-CSRFToken": getCSRFValue(),
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                });
                if (response.status === 200) {
                    return this.whoAmI();
                }
            } catch (error) {
                checkForTypeError(error);
                throw error;
            }
            throw new UserError("Failed to logout", response);
        },
        async init() {
            if (!this.initialized) {
                this.initialzingPromise = await this.whoAmI();
            }
            if (this.initializingPromise) {
                await this.initializingPromise;
            }
        },
    },
});
