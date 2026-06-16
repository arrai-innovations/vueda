import { scopedIt } from "@tests/unit/utils.js";
import { getAppModelDotName, memoizedSnakeCase } from "@vueda/utils/case.js";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { PAGE_SIZE_PARAM } from "@vueda/utils/constants.js";
import { getUrl } from "@vueda/utils/urls.js";
import { createPinia, setActivePinia } from "pinia";

describe("lib/store/storeModelChoices.js", () => {
    let fetchHelperMock, storeModule, store;

    beforeEach(async () => {
        setActivePinia(createPinia());
        fetchHelperMock = vi.fn();
        vi.doMock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper: fetchHelperMock }));
        storeModule = await import("@vueda/stores/storeModelChoices.js");
        store = storeModule.storeModelChoices();
    });

    afterEach(() => {
        vi.resetAllMocks();
        vi.resetModules();
    });

    scopedIt("setChoices stores data keyed by app and model", () => {
        store.setChoices("blog", "post", "status", ["draft"]);
        const key = getAppModelDotName({ app: "blog", model: "post" });
        expect(store.choices[key].status).toEqual(["draft"]);
    });

    scopedIt("setFilterChoices stores data keyed by app and model", () => {
        store.setFilterChoices("shop", "item", "category", [1, 2]);
        const key = getAppModelDotName({ app: "shop", model: "item" });
        expect(store.filterChoices[key].category).toEqual([1, 2]);
    });

    scopedIt("initializeChoice initializes choice containers", () => {
        store.initializeChoice("blog", "post");
        const key = getAppModelDotName({ app: "blog", model: "post" });
        expect(store.choices[key]).toEqual({});

        store.initializeChoice("shop", "item", true);
        const fKey = getAppModelDotName({ app: "shop", model: "item" });
        expect(store.filterChoices[fKey]).toEqual({});
    });

    scopedIt("fetchChoices fetches and stores choices", async () => {
        const data = ["a", "b"];
        fetchHelperMock.mockResolvedValue(data);
        const result = await store.fetchChoices("app", "model", "field");
        const key = getAppModelDotName({ app: "app", model: "model" });
        const expectedUrl = `${httpOrHttpsHostname}${getUrl("infoModelInfoChoices")}${memoizedSnakeCase("app")}/${memoizedSnakeCase("model")}/${memoizedSnakeCase("field")}/?${PAGE_SIZE_PARAM}=200`;
        expect(fetchHelperMock).toHaveBeenCalledWith(
            expectedUrl,
            { method: "GET" },
            `Failed to fetch choices for ${key}.field`,
            storeModule.ModelChoicesError,
        );
        expect(result).toEqual(data);
        expect(store.choices[key].field).toEqual(data);
        expect(store.promises[key].field).toBeUndefined();
    });

    scopedIt("deduplicates concurrent fetchChoices calls", async () => {
        let resolve;
        // eslint-disable-next-line promise/param-names
        const promise = new Promise((r) => {
            resolve = r;
        });
        fetchHelperMock.mockReturnValue(promise);

        const p1 = store.fetchChoices("a", "b", "c");
        const p2 = store.fetchChoices("a", "b", "c");

        expect(fetchHelperMock).toHaveBeenCalledTimes(1);

        resolve(["x"]);
        const r1 = await p1;
        const r2 = await p2;

        expect(r1).toBe(r2);
    });

    scopedIt("fetchFilterChoices fetches and stores choices", async () => {
        const data = [1, 2];
        fetchHelperMock.mockResolvedValue(data);
        const result = await store.fetchFilterChoices("app", "model", "field");
        const key = getAppModelDotName({ app: "app", model: "model" });
        const expectedUrl = `${httpOrHttpsHostname}${getUrl("infoModelInfoFilterChoices")}${memoizedSnakeCase("app")}/${memoizedSnakeCase("model")}/field/?${PAGE_SIZE_PARAM}=200`;
        expect(fetchHelperMock).toHaveBeenCalledWith(
            expectedUrl,
            { method: "GET" },
            `Failed to fetch choices for ${key}.field`,
            storeModule.ModelChoicesError,
        );
        expect(result).toEqual(data);
        expect(store.filterChoices[key].field).toEqual(data);
        expect(store.filterPromises[key].field).toBeUndefined();
    });
});
