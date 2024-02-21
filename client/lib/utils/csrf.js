import { CSRF_COOKIE_NAME } from "@vueda/utils/constants";
import Cookies from "js-cookie";

export const getCSRFValue = () => {
    return Cookies.get(CSRF_COOKIE_NAME);
};
