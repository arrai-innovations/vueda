/**
 * @module utils/csrf
 * @description Reads the CSRF token from the browser cookie for use in mutating HTTP requests.
 */
import { CSRF_COOKIE_NAME } from "@vueda/utils/constants.js";
import Cookies from "js-cookie";

export const getCSRFValue = () => {
    return Cookies.get(CSRF_COOKIE_NAME);
};
