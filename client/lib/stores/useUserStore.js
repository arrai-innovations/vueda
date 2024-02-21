import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { getCSRFValue } from "@vueda/utils/csrf.js";
import { FormValidationError } from "@vueda/utils/errors.js";
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

export default defineStore("user", {
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
                const response = await fetch(`${httpOrHttpsHostname}/routes/users/who-am-i/`, {
                    method: "GET",
                    credentials: "include",
                });
                if (response.status === 200) {
                    const user = await response.json();
                    this.loggedIn = !!user.id;
                    this.details = user;
                } else {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new UserError("Failed to get current user", response);
                }
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
                response = await fetch(`${httpOrHttpsHostname}/routes/users/login/`, {
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
                response = await fetch(`${httpOrHttpsHostname}/routes/users/logout/`, {
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
