import { reactive, readonly } from 'vue';
import throttle from 'lodash-es/throttle.js';
import once from 'lodash-es/once.js';
import { httpOrHttpsHostname } from '@vueda/utils/connectionHostname.js';
import { getCSRFValue } from '@/utils/csrf';
import { FormValidationError } from '@/utils/errors';
import { tryOnMounted } from '@vueuse/core';

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

const state = reactive({
    loggedIn: false,
    loggedInUser: {},
    initialized: undefined,
    loading: false,
    error: null,
    errored: false,
});

const whoAmI = async () => {
    if (state.initialized) {
        state.initialized = false;
    }
    try {
        const response = await fetch(`${httpOrHttpsHostname}/routes/users/who-am-i/`, {
            method: "GET",
            credentials: "include",
        });
        if (response.status === 200) {
            const user = await response.json();
            state.loggedIn = !!user.id;
            state.details = user;
        } else {
            // noinspection ExceptionCaughtLocallyJS
            throw new UserError("Failed to get current user", response);
        }
    } catch (error) {
        checkForTypeError(error);
        throw error;
    } finally {
        state.initialized = true;
    }
};
const throttledWhoAmI = throttle(whoAmI, 1000, { leading: true, trailing: true });
const init = once(throttledWhoAmI);

const login = async (payload) => {
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
            return whoAmI();
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
};


const logout = async () => {
    if (!state.loggedIn) {
        // why call logout if you're not logged in?
        // confirm the user state
        await whoAmI();
        if (!state.loggedIn) {
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
            return whoAmI();
        }
    } catch (error) {
        checkForTypeError(error);
        throw error;
    }
    throw new UserError("Failed to logout", response);
};

const readonlyState = readonly(state);

export default function useUser() {
    tryOnMounted(init);
    return {
        state: readonlyState,
        whoAmI: throttledWhoAmI,
        login,
        logout,
    };
}
