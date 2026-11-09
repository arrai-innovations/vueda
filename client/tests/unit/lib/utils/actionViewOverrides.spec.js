let warnUnmatchedActionViews;
let warn;

const model = { app: "shop", model: "order", actionNames: ["list", "approve"], transitionCodes: [] };

beforeEach(async () => {
    // The module remembers warned paths for the session, so each test starts from a fresh copy.
    vi.resetModules();
    ({ warnUnmatchedActionViews } = await import("@vueda/utils/actionViewOverrides.js"));
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
    warn.mockRestore();
});

describe("lib/utils/actionViewOverrides.js", () => {
    it("warns once about a file whose action part matches no action", () => {
        const paths = ["/src/views/ViewActionShopOrderAprove.vue"];
        warnUnmatchedActionViews(paths, model);
        warnUnmatchedActionViews(paths, model);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("/src/views/ViewActionShopOrderAprove.vue"), [
            "ViewActionShopOrderList.vue",
            "ViewActionShopOrderApprove.vue",
        ]);
        expect(warn.mock.calls[0][0]).toContain("shop.order");
    });

    it("does not warn about a file that matches an action", () => {
        warnUnmatchedActionViews(["/src/views/ViewActionShopOrderApprove.vue"], model);
        expect(warn).not.toHaveBeenCalled();
    });

    it("does not warn about a file that matches a transition code", () => {
        warnUnmatchedActionViews(["/src/views/ViewActionShopOrderMarkPaid.vue"], {
            ...model,
            transitionCodes: ["mark_paid"],
        });
        expect(warn).not.toHaveBeenCalled();
    });

    it("does not warn when the project has no action view files", () => {
        warnUnmatchedActionViews([], model);
        expect(warn).not.toHaveBeenCalled();
    });

    it("ignores files for other models and action-only files", () => {
        warnUnmatchedActionViews(
            [
                "/src/views/ViewActionShopOrderlineApprove.vue",
                "/src/views/ViewActionShopOrder2Approve.vue",
                "/src/views/ViewActionShopCustomerAprove.vue",
                "/src/views/ViewActionAprove.vue",
                "/src/views/ViewActionShopOrder.vue",
            ],
            model,
        );
        expect(warn).not.toHaveBeenCalled();
    });
});
