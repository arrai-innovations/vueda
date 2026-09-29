import { scopedIt } from "@tests/unit/utils.js";
import { getUrl, resetCustomUrls, setCustomUrl } from "@vueda/utils/urls.js";

describe("lib/utils/urls.js", () => {
    afterEach(() => {
        resetCustomUrls();
    });

    scopedIt("defaults the password reset URLs to the routes vueda.user serves", () => {
        expect(getUrl("forgotPassword")).toBe("/routes/vueda.user/forgot-password/");
        expect(getUrl("resetPassword")).toBe("/routes/vueda.user/reset-password/");
        expect(getUrl("isResetLinkValid")).toBe("/routes/vueda.user/reset-password/?pk={pk}&token={token}");
    });

    scopedIt("prefers a custom URL over the default", () => {
        setCustomUrl("forgotPassword", "/api/forgot/");
        expect(getUrl("forgotPassword")).toBe("/api/forgot/");
    });
});
