import { scopedIt } from "@tests/unit/utils.js";

describe("lib/router/routerComponent.js", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    scopedIt("crudComponents return default components", async () => {
        const listComponent = {};
        const createComponent = {};
        vi.doMock("@vueda/views/ViewList.vue", () => ({ default: listComponent }));
        vi.doMock("@vueda/views/ViewCreate.vue", () => ({ default: createComponent }));
        const mod = await import("@vueda/router/routerComponent.js");
        const { crudComponents } = mod;
        expect(typeof crudComponents.list).toBe("function");
        expect(await crudComponents.list()).toBe(listComponent);
        expect(typeof crudComponents.create).toBe("function");
        expect(await crudComponents.create()).toBe(createComponent);
    });

    scopedIt("setCrudComponents merges custom components", async () => {
        const listDefault = {};
        const createDefault = {};
        vi.doMock("@vueda/views/ViewList.vue", () => ({ default: listDefault }));
        vi.doMock("@vueda/views/ViewCreate.vue", () => ({ default: createDefault }));
        const mod = await import("@vueda/router/routerComponent.js");
        mod.setCrudComponents({
            list: async () => "customList",
            extra: async () => "extraView",
        });
        expect(await mod.crudComponents.list()).toBe("customList");
        expect(await mod.crudComponents.extra()).toBe("extraView");
        expect(await mod.crudComponents.create()).toBe(createDefault);
    });
});
