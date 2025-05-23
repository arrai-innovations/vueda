import { scopedIt } from "@tests/unit/utils.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { createPinia, setActivePinia } from "pinia";

const fetchHelper = vi.fn();
const getUrl = vi.fn(() => "/info/");

vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper }));
vi.mock("@vueda/utils/urls.js", () => ({ getUrl }));
vi.mock("@vueda/utils/connectionHostname.js", () => ({ httpOrHttpsHostname: "http://test" }));

describe("lib/stores/storeModelInfo.js", () => {
    let storeModule, store;

    beforeEach(async () => {
        setActivePinia(createPinia());
        fetchHelper.mockReset();
        getUrl.mockReturnValue("/info/");
        storeModule = await import("@vueda/stores/storeModelInfo.js");
        store = storeModule.storeModelInfo();
    });

    afterEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    scopedIt("returns cached info without fetching", async () => {
        const args = { app: "blog", model: "post" };
        const key = getAppModelDotName(args);
        const info = { pk: "id", fields: { id: { pk: true } } };
        store.infos[key] = info;

        const result = await store.fetchModelInfo(args);

        expect(result).toEqual(info);
        expect(fetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("fetches and caches model info", async () => {
        const args = { app: "blog", model: "post" };
        const key = getAppModelDotName(args);
        const serverData = {
            app_label: "blog",
            model: "post",
            model_fields: {
                id: { pk: true, type_db: "AutoField" },
                title: { type_db: "CharField" },
            },
            model_actions: [],
            model_expands: [],
            model_ordering: [],
            model_filtering: {},
            model_permissions: [],
        };
        fetchHelper.mockResolvedValue(serverData);

        const result = await store.fetchModelInfo(args);

        expect(fetchHelper).toHaveBeenCalledTimes(1);
        expect(fetchHelper.mock.calls[0][0]).toContain("/info/blog/post/");
        expect(fetchHelper.mock.calls[0][1]).toEqual({ method: "GET" });
        expect(fetchHelper.mock.calls[0][2]).toBe("Failed to fetch model info");
        expect(fetchHelper.mock.calls[0][3]).toBe(storeModule.ModelInfoError);

        expect(result.pk).toBe("id");
        expect(result.fields.id.typeDb).toBe("AutoField");
        expect(store.infos[key]).toEqual(result);
        expect(store.promises[key]).toBeUndefined();
    });

    scopedIt("rejects when pk field missing", async () => {
        const args = { app: "a", model: "b" };
        const key = getAppModelDotName(args);
        const serverData = {
            app_label: "a",
            model: "b",
            model_fields: {
                title: { type_db: "CharField" },
            },
            model_actions: [],
            model_expands: [],
            model_ordering: [],
            model_filtering: {},
            model_permissions: [],
        };
        fetchHelper.mockResolvedValue(serverData);

        await expect(store.fetchModelInfo(args)).rejects.toThrow(new RegExp(`no pk field found for ${key}`));
    });

    scopedIt("caches errors to avoid repeated fetches", async () => {
        const args = { app: "err", model: "bad" };
        const key = getAppModelDotName(args);
        const error = new Error("boom");
        fetchHelper.mockRejectedValue(error);

        await expect(store.fetchModelInfo(args)).rejects.toBe(error);
        expect(store.promises[key]).toBeUndefined();
        fetchHelper.mockClear();
        await expect(store.fetchModelInfo(args)).rejects.toBe(error);
        expect(fetchHelper).not.toHaveBeenCalled();
    });

    scopedIt("rejects when app or model missing", async () => {
        await expect(store.fetchModelInfo({ app: "", model: null })).rejects.toThrow(
            "storeModelInfo.fetchModelInfo: app and model must be provided",
        );
    });
});
