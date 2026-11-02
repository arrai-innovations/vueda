import { scopedIt } from "@tests/unit/utils.js";
import { getAppModelDotName, memoizedSnakeCase } from "@vueda/utils/case.js";
import { httpOrHttpsHostname } from "@vueda/utils/connectionHostname.js";
import { PAGE_SIZE_PARAM } from "@vueda/utils/constants.js";
import { getUrl } from "@vueda/utils/urls.js";
import { createPinia, setActivePinia } from "pinia";
import { toRef } from "vue";

describe("lib/stores/storeModelChoices.js", () => {
    let fetchHelperMock, storeModule, store, AuthScopeInvalidatedError;

    beforeEach(async () => {
        setActivePinia(createPinia());
        fetchHelperMock = vi.fn();
        vi.doMock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper: fetchHelperMock }));
        storeModule = await import("@vueda/stores/storeModelChoices.js");
        ({ AuthScopeInvalidatedError } = await import("@vueda/utils/errors.js"));
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
    describe("clearAuthScoped", () => {
        scopedIt("empties choices, filterChoices, and both promise maps", async () => {
            const key = getAppModelDotName({ app: "blog", model: "post" });
            store.setChoices("blog", "post", "status", ["draft"]);
            store.setFilterChoices("blog", "post", "author", [1]);
            store.promises[key] = { status: Promise.resolve([]) };
            store.filterPromises[key] = { author: Promise.resolve([]) };

            store.clearAuthScoped();

            expect(store.choices).toEqual({});
            expect(store.filterChoices).toEqual({});
            expect(store.promises).toEqual({});
            expect(store.filterPromises).toEqual({});
        });

        scopedIt("deletes leaves before buckets so a reference held by a consumer stays live", async () => {
            const key = getAppModelDotName({ app: "blog", model: "post" });
            fetchHelperMock.mockResolvedValue(["draft"]);
            await store.fetchChoices("blog", "post", "status");

            // this is the handle useModelChoices keeps: toRef(choiceProps[key], fieldName)
            const held = toRef(store.choices[key], "status");
            expect(held.value).toEqual(["draft"]);

            store.clearAuthScoped();
            expect(held.value).toBeUndefined();

            fetchHelperMock.mockResolvedValue(["published"]);
            await store.fetchChoices("blog", "post", "status");
            expect(store.choices[key].status).toEqual(["published"]);
        });

        scopedIt("discards choices that arrive after the clear and lets the next call refetch", async () => {
            const key = getAppModelDotName({ app: "blog", model: "post" });
            let resolveFetch;
            fetchHelperMock.mockReturnValueOnce(
                new Promise((resolve) => {
                    resolveFetch = resolve;
                }),
            );

            const inFlight = store.fetchChoices("blog", "post", "status");
            store.clearAuthScoped();
            resolveFetch(["draft"]);

            await expect(inFlight).rejects.toThrow(AuthScopeInvalidatedError);
            expect(store.choices).toEqual({});

            fetchHelperMock.mockResolvedValueOnce(["published"]);
            await store.fetchChoices("blog", "post", "status");
            expect(fetchHelperMock).toHaveBeenCalledTimes(2);
            expect(store.choices[key].status).toEqual(["published"]);
        });
    });

    describe("fetchChoiceLabels", () => {
        const key = getAppModelDotName({ app: "geo", model: "address" });
        const choicesPath = `${httpOrHttpsHostname}${getUrl("infoModelInfoChoices")}${memoizedSnakeCase("geo")}/${memoizedSnakeCase("address")}/${memoizedSnakeCase("stateProvince")}/`;

        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        scopedIt("reads labels from a complete option list without a request", async () => {
            store.setChoices("geo", "address", "stateProvince", {
                results: [
                    { label: "Connecticut", value: "CT" },
                    { label: "Ontario", value: "ON" },
                ],
                totalRecords: 2,
            });

            const labels = await store.fetchChoiceLabels("geo", "address", "stateProvince", ["ON"]);

            expect(labels).toEqual({ ON: "Ontario" });
            expect(fetchHelperMock).not.toHaveBeenCalled();
        });

        scopedIt("requests a value that a complete option list lacks, since its row can be newer", async () => {
            store.setChoices("geo", "address", "stateProvince", {
                results: [{ label: "Connecticut", value: "CT" }],
                totalRecords: 1,
            });
            fetchHelperMock.mockResolvedValue({ results: [{ label: "Yukon", value: "YT" }], totalRecords: 1 });

            const labels = store.fetchChoiceLabels("geo", "address", "stateProvince", ["CT", "YT"]);
            await vi.runAllTimersAsync();

            expect(await labels).toEqual({ CT: "Connecticut", YT: "Yukon" });
            expect(fetchHelperMock).toHaveBeenCalledTimes(1);
            expect(fetchHelperMock.mock.calls[0][0]).toContain(`${PAGE_SIZE_PARAM}=1&value=YT`);
        });

        scopedIt("sends one value-filtered request for the values that calls ask for together", async () => {
            fetchHelperMock.mockResolvedValue({
                results: [
                    { label: "Connecticut", value: "CT" },
                    { label: "Ontario", value: "ON" },
                ],
            });

            const first = store.fetchChoiceLabels("geo", "address", "stateProvince", ["CT"]);
            const second = store.fetchChoiceLabels("geo", "address", "stateProvince", ["ON", "CT"]);
            await vi.runAllTimersAsync();

            expect(await first).toEqual({ CT: "Connecticut" });
            expect(await second).toEqual({ ON: "Ontario", CT: "Connecticut" });
            expect(fetchHelperMock).toHaveBeenCalledTimes(1);
            expect(fetchHelperMock).toHaveBeenCalledWith(
                `${choicesPath}?${PAGE_SIZE_PARAM}=2&value=CT&value=ON`,
                { method: "GET" },
                `Failed to fetch choice labels for ${key}.stateProvince`,
                storeModule.ModelChoicesError,
            );
            expect(store.choiceLabels[key].stateProvince).toEqual({ CT: "Connecticut", ON: "Ontario" });
            expect(store.choices[key]).toBeUndefined();
        });

        scopedIt("requests labels when the stored option list is only the first page", async () => {
            store.setChoices("geo", "address", "stateProvince", {
                results: [{ label: "Connecticut", value: "CT" }],
                totalRecords: 300,
            });
            fetchHelperMock.mockResolvedValue({ results: [{ label: "Yukon", value: "YT" }] });

            const labels = store.fetchChoiceLabels("geo", "address", "stateProvince", ["YT"]);
            await vi.runAllTimersAsync();

            expect(await labels).toEqual({ YT: "Yukon" });
            expect(fetchHelperMock).toHaveBeenCalledTimes(1);
        });

        scopedIt("stores a value with no option as null", async () => {
            fetchHelperMock.mockResolvedValue({ results: [], totalRecords: 0 });

            const labels = store.fetchChoiceLabels("geo", "address", "stateProvince", ["XX"]);
            await vi.runAllTimersAsync();

            expect(await labels).toEqual({ XX: null });
            expect(store.choiceLabels[key].stateProvince).toEqual({ XX: null });
        });

        scopedIt("requests a stored label again and keeps it readable until the answer arrives", async () => {
            fetchHelperMock.mockResolvedValueOnce({ results: [{ label: "Ontario", value: "ON" }] });
            const first = store.fetchChoiceLabels("geo", "address", "stateProvince", ["ON"]);
            await vi.runAllTimersAsync();
            await first;

            fetchHelperMock.mockResolvedValueOnce({ results: [{ label: "Ontario (CA)", value: "ON" }] });
            const second = store.fetchChoiceLabels("geo", "address", "stateProvince", ["ON"]);
            expect(store.getChoiceLabel("geo", "address", "stateProvince", "ON")).toBe("Ontario");
            await vi.runAllTimersAsync();

            expect(await second).toEqual({ ON: "Ontario (CA)" });
            expect(fetchHelperMock).toHaveBeenCalledTimes(2);
        });

        scopedIt("leaves values unknown when the response is cut to one page", async () => {
            fetchHelperMock.mockResolvedValue({ results: [{ label: "Connecticut", value: "CT" }], totalRecords: 2 });

            const labels = store.fetchChoiceLabels("geo", "address", "stateProvince", ["CT", "ON"]);
            await vi.runAllTimersAsync();

            expect(await labels).toEqual({ CT: "Connecticut", ON: undefined });
            expect(store.choiceLabels[key].stateProvince).toEqual({ CT: "Connecticut" });
        });

        scopedIt("prefers a fetched label over the same value in a partial option list", async () => {
            store.setChoices("geo", "address", "stateProvince", {
                results: [{ label: "Ontario", value: "ON" }],
                totalRecords: 300,
            });
            fetchHelperMock.mockResolvedValue({ results: [{ label: "Ontario (CA)", value: "ON" }] });

            const labels = store.fetchChoiceLabels("geo", "address", "stateProvince", ["ON"]);
            await vi.runAllTimersAsync();

            expect(await labels).toEqual({ ON: "Ontario (CA)" });
            expect(store.getChoiceLabel("geo", "address", "stateProvince", "ON")).toBe("Ontario (CA)");
        });

        scopedIt("waits for a choice list request in flight and reads the labels from it", async () => {
            let resolveList;
            fetchHelperMock.mockReturnValueOnce(
                new Promise((resolve) => {
                    resolveList = resolve;
                }),
            );
            const listRequest = store.fetchChoices("geo", "address", "stateProvince");

            const labels = store.fetchChoiceLabels("geo", "address", "stateProvince", ["ON"]);
            resolveList({ results: [{ label: "Ontario", value: "ON" }], totalRecords: 1 });
            await listRequest;
            await vi.runAllTimersAsync();

            expect(await labels).toEqual({ ON: "Ontario" });
            expect(fetchHelperMock).toHaveBeenCalledTimes(1);
        });

        scopedIt("splits a batch of more than 50 values into several requests", async () => {
            fetchHelperMock.mockResolvedValue({ results: [] });
            const values = Array.from({ length: 51 }, (_, index) => `V${index}`);

            const labels = store.fetchChoiceLabels("geo", "address", "stateProvince", values);
            await vi.runAllTimersAsync();
            await labels;

            expect(fetchHelperMock).toHaveBeenCalledTimes(2);
            expect(fetchHelperMock.mock.calls[0][0]).toContain(`${PAGE_SIZE_PARAM}=50&`);
            expect(fetchHelperMock.mock.calls[1][0]).toContain(`${PAGE_SIZE_PARAM}=1&value=V50`);
        });

        scopedIt("splits a batch whose long values would make the query too long", async () => {
            fetchHelperMock.mockResolvedValue({ results: [] });
            // 20 values of 250 characters make a query of about 5 KB, over the 4000-character cap.
            const values = Array.from({ length: 20 }, (_, index) => `${index}`.padStart(250, "x"));

            const labels = store.fetchChoiceLabels("geo", "address", "stateProvince", values);
            await vi.runAllTimersAsync();
            await labels;

            expect(fetchHelperMock).toHaveBeenCalledTimes(2);
            for (const [url] of fetchHelperMock.mock.calls) {
                expect(new URL(url).search.length).toBeLessThan(4100);
            }
        });

        scopedIt("compares numeric values as strings", async () => {
            fetchHelperMock.mockResolvedValue({ results: [{ label: "Ontario", value: "7" }] });

            const labels = store.fetchChoiceLabels("geo", "address", "stateProvince", [7]);
            await vi.runAllTimersAsync();

            expect(await labels).toEqual({ 7: "Ontario" });
        });

        scopedIt("does not label the value 'null' with an option whose value is null", async () => {
            fetchHelperMock.mockResolvedValue({ results: [{ label: "No Type", value: null }], totalRecords: 1 });

            const labels = store.fetchChoiceLabels("geo", "address", "stateProvince", ["null"]);
            await vi.runAllTimersAsync();

            expect(await labels).toEqual({ null: null });
        });

        scopedIt("matches numeric option values in a stored option list as strings", async () => {
            store.setChoices("geo", "address", "stateProvince", { results: [{ label: "Ontario", value: 7 }] });

            const labels = await store.fetchChoiceLabels("geo", "address", "stateProvince", ["7"]);

            expect(labels).toEqual({ 7: "Ontario" });
            expect(fetchHelperMock).not.toHaveBeenCalled();
        });

        scopedIt("rejects every caller of a failed request and lets the next call retry", async () => {
            const failure = new Error("network");
            fetchHelperMock.mockRejectedValueOnce(failure);

            const first = store.fetchChoiceLabels("geo", "address", "stateProvince", ["CT"]);
            const second = store.fetchChoiceLabels("geo", "address", "stateProvince", ["ON"]);
            const firstSettled = expect(first).rejects.toBe(failure);
            const secondSettled = expect(second).rejects.toBe(failure);
            await vi.runAllTimersAsync();
            await firstSettled;
            await secondSettled;
            expect(store.choiceLabelPromises[key].stateProvince).toEqual({});

            fetchHelperMock.mockResolvedValueOnce({ results: [{ label: "Connecticut", value: "CT" }] });
            const retry = store.fetchChoiceLabels("geo", "address", "stateProvince", ["CT"]);
            await vi.runAllTimersAsync();
            expect(await retry).toEqual({ CT: "Connecticut" });
        });

        scopedIt("discards labels that arrive after clearAuthScoped", async () => {
            let resolveFetch;
            fetchHelperMock.mockReturnValueOnce(
                new Promise((resolve) => {
                    resolveFetch = resolve;
                }),
            );

            const inFlight = store.fetchChoiceLabels("geo", "address", "stateProvince", ["CT"]);
            const settled = expect(inFlight).rejects.toThrow(AuthScopeInvalidatedError);
            await vi.runAllTimersAsync();
            store.clearAuthScoped();
            resolveFetch({ results: [{ label: "Connecticut", value: "CT" }] });
            await settled;

            expect(store.choiceLabels).toEqual({});
            expect(store.choiceLabelPromises).toEqual({});
            expect(store.choiceLabelBatches).toEqual({});
        });

        scopedIt("sends nothing for a batch that clearAuthScoped dropped before it was sent", async () => {
            const pending = store.fetchChoiceLabels("geo", "address", "stateProvince", ["CT"]);
            const settled = expect(pending).rejects.toThrow(AuthScopeInvalidatedError);
            store.clearAuthScoped();
            await vi.runAllTimersAsync();
            await settled;

            expect(fetchHelperMock).not.toHaveBeenCalled();
        });
    });
});
