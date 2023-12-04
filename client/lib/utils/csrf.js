import Cookies from "js-cookie";

import { CSRF_COOKIE_NAME } from "@/utils/constants";

export const getCSRFValue = () => {
    return Cookies.get(CSRF_COOKIE_NAME);
};
