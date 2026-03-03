/**
 * @module utils/csrf
 * @description Reads the CSRF token from the browser cookie for use in mutating HTTP requests.
 */
import { CSRF_COOKIE_NAME } from "@vueda/utils/constants.js";
import Cookies from "js-cookie";

/**
 * Reads the CSRF token from the browser cookie.
 *
 * @returns {string|undefined} The CSRF token value, or undefined if the cookie is not set.
 */
export const getCSRFValue = () => {
    return Cookies.get(CSRF_COOKIE_NAME);
};
