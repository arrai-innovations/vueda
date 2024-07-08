import { CSRF_COOKIE_NAME } from "./constants.js";
import Cookies from "js-cookie";

export const getCSRFValue = () => {
    return Cookies.get(CSRF_COOKIE_NAME);
};
