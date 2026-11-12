let warnUnmatchedProjectViews;
let warn;

const model = {
    app: "shop",
    model: "order",
    actionNames: ["list", "retrieve", "partial_update", "approve"],
    transitionCodes: [],
    registryKeys: ["list", "read", "update"],
};

beforeEach(async () => {
    // The module remembers warned file names for the session, so each test starts from a fresh copy.
    vi.resetModules();
    ({ warnUnmatchedProjectViews } = await import("@vueda/utils/projectViewOverrides.js"));
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
    warn.mockRestore();
});

describe("lib/utils/projectViewOverrides.js", () => {
    describe("warnUnmatchedProjectViews", () => {
        it("warns once about an action view whose action part matches no action", () => {
            const fileNames = ["ViewActionShopOrderAprove.vue"];
            warnUnmatchedProjectViews(fileNames, model);
            warnUnmatchedProjectViews(fileNames, model);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("ViewActionShopOrderAprove.vue"), [
                "ViewListShopOrder.vue",
                "ViewReadShopOrder.vue",
                "ViewActionShopOrderApprove.vue",
            ]);
            expect(warn.mock.calls[0][0]).toContain("shop.order");
        });

        it("expects no file name for an action without a client route", () => {
            warnUnmatchedProjectViews(["ViewActionShopOrderAprove.vue"], model);
            expect(warn.mock.calls[0][1]).not.toContain("ViewActionShopOrderPartialUpdate.vue");
        });

        it("warns about a built-in view whose view name matches no built-in action", () => {
            warnUnmatchedProjectViews(["ViewLsitShopOrder.vue"], model);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][0]).toContain("ViewLsitShopOrder.vue");
        });

        it("warns about an action view named for a built-in action, which the registry resolves", () => {
            warnUnmatchedProjectViews(["ViewActionShopOrderList.vue"], model);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][1]).toContain("ViewListShopOrder.vue");
        });

        it("does not warn about files that match an action", () => {
            warnUnmatchedProjectViews(
                ["ViewActionShopOrderApprove.vue", "ViewListShopOrder.vue", "ViewReadShopOrder.vue"],
                model,
            );
            expect(warn).not.toHaveBeenCalled();
        });

        it("does not warn about a file that matches a transition code", () => {
            warnUnmatchedProjectViews(["ViewActionShopOrderMarkPaid.vue"], {
                ...model,
                transitionCodes: ["mark_paid"],
            });
            expect(warn).not.toHaveBeenCalled();
        });

        it("expects the action view form for a transition code that equals a registry key", () => {
            const transitionModel = { ...model, actionNames: [], transitionCodes: ["update"] };
            warnUnmatchedProjectViews(["ViewActionShopOrderUpdate.vue"], transitionModel);
            expect(warn).not.toHaveBeenCalled();
            warnUnmatchedProjectViews(["ViewUpdateShopOrder.vue"], transitionModel);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("ViewUpdateShopOrder.vue"), [
                "ViewActionShopOrderUpdate.vue",
            ]);
        });

        it("does not warn when the project has no view files", () => {
            warnUnmatchedProjectViews([], model);
            expect(warn).not.toHaveBeenCalled();
        });

        it("ignores files for other models, project-wide files, and files without an action part", () => {
            warnUnmatchedProjectViews(
                [
                    "ViewActionShopOrderlineApprove.vue",
                    "ViewActionShopOrder2Approve.vue",
                    "ViewActionShopCustomerAprove.vue",
                    "ViewListShopCustomer.vue",
                    "ViewActionAprove.vue",
                    "ViewActionShopOrder.vue",
                    "ViewShopOrder.vue",
                    "ViewList.vue",
                    "ViewAction.vue",
                    "ViewWelcome.vue",
                ],
                model,
            );
            expect(warn).not.toHaveBeenCalled();
        });
    });
});
