let warnUnmatchedProjectViews;
let reportProjectViewLoadError;
let warn;
let error;

const model = {
    app: "shop",
    model: "order",
    actionNames: ["list", "retrieve", "partial_update", "approve"],
    transitionCodes: [],
    registryKeys: ["list", "read", "update"],
};

beforeEach(async () => {
    // The module remembers warned paths for the session, so each test starts from a fresh copy.
    vi.resetModules();
    ({ warnUnmatchedProjectViews, reportProjectViewLoadError } = await import("@vueda/utils/projectViewOverrides.js"));
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    warn.mockRestore();
    error.mockRestore();
});

describe("lib/utils/projectViewOverrides.js", () => {
    describe("warnUnmatchedProjectViews", () => {
        it("warns once about an action view whose action part matches no action", () => {
            const paths = ["/src/views/ViewActionShopOrderAprove.vue"];
            warnUnmatchedProjectViews(paths, model);
            warnUnmatchedProjectViews(paths, model);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn).toHaveBeenCalledWith(expect.stringContaining("/src/views/ViewActionShopOrderAprove.vue"), [
                "ViewListShopOrder.vue",
                "ViewReadShopOrder.vue",
                "ViewActionShopOrderApprove.vue",
            ]);
            expect(warn.mock.calls[0][0]).toContain("shop.order");
        });

        it("expects no file name for an action without a client route", () => {
            warnUnmatchedProjectViews(["/src/views/ViewActionShopOrderAprove.vue"], model);
            expect(warn.mock.calls[0][1]).not.toContain("ViewActionShopOrderPartialUpdate.vue");
        });

        it("warns about a built-in view whose view name matches no built-in action", () => {
            warnUnmatchedProjectViews(["/src/views/ViewLsitShopOrder.vue"], model);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][0]).toContain("/src/views/ViewLsitShopOrder.vue");
        });

        it("warns about an action view named for a built-in action, which the registry resolves", () => {
            warnUnmatchedProjectViews(["/src/views/ViewActionShopOrderList.vue"], model);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][1]).toContain("ViewListShopOrder.vue");
        });

        it("does not warn about files that match an action", () => {
            warnUnmatchedProjectViews(
                [
                    "/src/views/ViewActionShopOrderApprove.vue",
                    "/src/views/ViewListShopOrder.vue",
                    "/src/views/ViewReadShopOrder.vue",
                ],
                model,
            );
            expect(warn).not.toHaveBeenCalled();
        });

        it("does not warn about a file that matches a transition code", () => {
            warnUnmatchedProjectViews(["/src/views/ViewActionShopOrderMarkPaid.vue"], {
                ...model,
                transitionCodes: ["mark_paid"],
            });
            expect(warn).not.toHaveBeenCalled();
        });

        it("expects the action view form for a transition code that equals a registry key", () => {
            const transitionModel = { ...model, actionNames: [], transitionCodes: ["update"] };
            warnUnmatchedProjectViews(["/src/views/ViewActionShopOrderUpdate.vue"], transitionModel);
            expect(warn).not.toHaveBeenCalled();
            warnUnmatchedProjectViews(["/src/views/ViewUpdateShopOrder.vue"], transitionModel);
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
                    "/src/views/ViewActionShopOrderlineApprove.vue",
                    "/src/views/ViewActionShopOrder2Approve.vue",
                    "/src/views/ViewActionShopCustomerAprove.vue",
                    "/src/views/ViewListShopCustomer.vue",
                    "/src/views/ViewActionAprove.vue",
                    "/src/views/ViewActionShopOrder.vue",
                    "/src/views/ViewShopOrder.vue",
                    "/src/views/ViewList.vue",
                    "/src/views/ViewAction.vue",
                    "/src/views/ViewWelcome.vue",
                ],
                model,
            );
            expect(warn).not.toHaveBeenCalled();
        });
    });

    describe("reportProjectViewLoadError", () => {
        it("logs the error for a project view file that exists", () => {
            const loadError = new Error("broken import");
            reportProjectViewLoadError(["/src/views/ViewList.vue"], "/src/views/ViewList.vue", loadError);
            expect(error).toHaveBeenCalledWith(expect.stringContaining("/src/views/ViewList.vue"), loadError);
        });

        it("stays silent for a project view file that does not exist", () => {
            reportProjectViewLoadError(["/src/views/ViewList.vue"], "/src/views/ViewRead.vue", new Error("missing"));
            expect(error).not.toHaveBeenCalled();
        });
    });
});
