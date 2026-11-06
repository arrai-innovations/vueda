import { scopedIt } from "@tests/unit/utils.js";

const target = { app: "shop", model: "order", action: "list", pk: "" };
const findProjectView = vi.fn((name, fallback) => fallback());

describe("lib/router/routerComponent.js", () => {
    beforeEach(() => {
        vi.resetModules();
        findProjectView.mockClear();
    });

    scopedIt("default loaders look up the project view by name and fall back to the VUEDA view", async () => {
        const listComponent = {};
        const historyListComponent = {};
        vi.doMock("@vueda/views/ViewList.vue", () => ({ default: listComponent }));
        vi.doMock("@vueda/views/ViewHistoryList.vue", () => ({ default: historyListComponent }));
        const { crudComponents } = await import("@vueda/router/routerComponent.js");
        expect(await crudComponents.list(target, { findProjectView })).toBe(listComponent);
        expect(findProjectView).toHaveBeenLastCalledWith("List", expect.any(Function));
        expect(await crudComponents["history-list"](target, { findProjectView })).toBe(historyListComponent);
        expect(findProjectView).toHaveBeenLastCalledWith("HistoryList", expect.any(Function));
    });

    scopedIt("default loaders return the project view that findProjectView finds", async () => {
        const projectView = {};
        const { crudComponents } = await import("@vueda/router/routerComponent.js");
        expect(await crudComponents.update(target, { findProjectView: async () => projectView })).toBe(projectView);
    });

    scopedIt("setCrudComponents replaces the default loader for its key", async () => {
        const createDefault = {};
        vi.doMock("@vueda/views/ViewCreate.vue", () => ({ default: createDefault }));
        const mod = await import("@vueda/router/routerComponent.js");
        mod.setCrudComponents({
            list: async () => "customList",
            extra: async () => "extraView",
        });
        expect(await mod.crudComponents.list(target, { findProjectView })).toBe("customList");
        expect(await mod.crudComponents.extra(target, { findProjectView })).toBe("extraView");
        expect(await mod.crudComponents.create(target, { findProjectView })).toBe(createDefault);
        expect(findProjectView).toHaveBeenCalledTimes(1);
        expect(findProjectView).toHaveBeenCalledWith("Create", expect.any(Function));
    });
});
