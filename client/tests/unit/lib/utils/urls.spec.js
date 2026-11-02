import { scopedIt } from "@tests/unit/utils.js";
import { getDetailUrl, getUrl, resetCustomUrls, setCustomUrl } from "@vueda/utils/urls.js";

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

    describe("Composite primary keys", () => {
        // The server sends a composite primary key as a JSON list. The detail URL must carry the
        // whole list in one path segment, which the server decodes back to the same text.
        scopedIt("puts the whole key in the detail URL's path", () => {
            const url = getDetailUrl({ app: "store", model: "orderitemcompositepk", pk: '["1", "2"]' });

            expect(decodeURIComponent(new URL(url).pathname)).toBe('/routes/store/orderitemcompositepk/["1", "2"]/');
        });

        scopedIt("puts the whole key in a detail action URL's path", () => {
            const url = getDetailUrl({
                app: "store",
                model: "orderitemcompositepk",
                pk: '["1", "2"]',
                action: "test-action",
            });

            expect(decodeURIComponent(new URL(url).pathname)).toBe(
                '/routes/store/orderitemcompositepk/["1", "2"]/test_action/',
            );
        });
    });
});
