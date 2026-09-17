import { scopedIt } from "@tests/unit/utils.js";
import { getAppModelDotName } from "@vueda/utils/case.js";
import { createPinia, setActivePinia } from "pinia";
import { toRef } from "vue";

const fetchHelper = vi.fn();
const getUrl = vi.fn(() => "/info/");

vi.mock("@vueda/utils/fetchSupport.js", () => ({ fetchHelper }));
vi.mock("@vueda/utils/urls.js", () => ({ getUrl }));
vi.mock("@vueda/utils/connectionHostname.js", () => ({ httpOrHttpsHostname: "http://test" }));

describe("lib/stores/storeModelInfo.js", () => {
    let storeModule, store, AuthScopeInvalidatedError;

    const serverData = (label) => ({
        app_label: "blog",
        model: "post",
        model_fields: { id: { pk: true, type_db: "AutoField" }, title: { type_db: label } },
        model_actions: [],
        model_expands: [],
        model_ordering: { default: [], fields: [] },
        model_filtering: {},
        model_permissions: [],
    });

    beforeEach(async () => {
        setActivePinia(createPinia());
        fetchHelper.mockReset();
        getUrl.mockReturnValue("/info/");
        storeModule = await import("@vueda/stores/storeModelInfo.js");
        ({ AuthScopeInvalidatedError } = await import("@vueda/utils/errors.js"));
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
            model_ordering: { default: [], fields: [] },
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

    scopedIt("requests the column totals section and exposes it as columnTotals", async () => {
        const args = { app: "blog", model: "post" };
        fetchHelper.mockResolvedValue({
            ...serverData("CharField"),
            model_column_totals: { fields: ["hours", "product_price"] },
        });

        const result = await store.fetchModelInfo(args);

        // Both lists have to name the section: `f` selects which root keys come back, `e` expands it.
        // Each goes out as one comma-separated value rather than a repeated key, which is how every
        // list-valued VUEDA parameter is sent and what the server splits on.
        const query = fetchHelper.mock.calls[0][0].split("?")[1];
        const params = new URLSearchParams(query);
        expect(params.get("f").split(",")).toContain("model_column_totals");
        expect(params.get("e").split(",")).toContain("model_column_totals");

        // `column_totals` is the only multi-word section name, so it is renamed rather than left
        // snake_case next to `ordering` and `filtering`.
        expect(result.columnTotals).toEqual({ fields: ["hours", "product_price"] });
        expect(result.column_totals).toBeUndefined();
    });

    scopedIt("camelCases expand descriptor root keys while preserving f field-name keys", async () => {
        const args = { app: "catalog", model: "widget" };
        const serverData = {
            app_label: "catalog",
            model: "widget",
            model_fields: {
                id: { pk: true, type_db: "AutoField" },
            },
            model_actions: [],
            model_expands: [
                {
                    name: "category",
                    app_label: "catalog",
                    model: "widgetcategory",
                    requires_permission: false,
                    f: {
                        created_at: { type_db: "DateTimeField", read_only: true },
                    },
                },
            ],
            model_ordering: { default: [], fields: [] },
            model_filtering: {},
            model_permissions: [],
        };
        fetchHelper.mockResolvedValue(serverData);

        const result = await store.fetchModelInfo(args);
        const expand = result.expand[0];
        // The expand root's own keys are camelCased to match field details.
        expect(expand.appLabel).toBe("catalog");
        expect(expand.app_label).toBeUndefined();
        expect(expand.model).toBe("widgetcategory");
        expect(expand.requiresPermission).toBe(false);
        // `f` field-name keys are server lookup keys: preserved as-is, while
        // each FieldInfo value is camelCased.
        expect(expand.f.created_at).toBeDefined();
        expect(expand.f.created_at.typeDb).toBe("DateTimeField");
        expect(expand.f.created_at.readOnly).toBe(true);
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
            model_ordering: { default: [], fields: [] },
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
    describe("clearAuthScoped", () => {
        scopedIt("empties infos, errors, and promises", async () => {
            const key = getAppModelDotName({ app: "blog", model: "post" });
            store.infos[key] = { pk: "id" };
            store.errors["blog.other"] = new Error("cached");
            store.promises["blog.third"] = Promise.resolve({});

            store.clearAuthScoped();

            expect(store.infos).toEqual({});
            expect(store.errors).toEqual({});
            expect(store.promises).toEqual({});
        });

        scopedIt("deletes keys in place so a reference held by a consumer stays live (forbids $reset)", async () => {
            const args = { app: "blog", model: "post" };
            const key = getAppModelDotName(args);
            fetchHelper.mockResolvedValue(serverData("CharField"));
            await store.fetchModelInfo(args);

            // this is the handle useModelInfo keeps: toRef(modelInfoStore.infos, key)
            const held = toRef(store.infos, key);
            expect(held.value.fields.title.typeDb).toBe("CharField");

            store.clearAuthScoped();
            expect(held.value).toBeUndefined();

            fetchHelper.mockResolvedValue(serverData("TextField"));
            await store.fetchModelInfo(args);
            expect(held.value.fields.title.typeDb).toBe("TextField");
        });

        scopedIt("discards a response that arrives after the clear and lets the next call refetch", async () => {
            const args = { app: "blog", model: "post" };
            const key = getAppModelDotName(args);
            let resolveFetch;
            fetchHelper.mockReturnValueOnce(
                new Promise((resolve) => {
                    resolveFetch = resolve;
                }),
            );

            const inFlight = store.fetchModelInfo(args);
            store.clearAuthScoped();
            resolveFetch(serverData("CharField"));

            await expect(inFlight).rejects.toThrow(AuthScopeInvalidatedError);
            expect(store.infos[key]).toBeUndefined();

            fetchHelper.mockResolvedValueOnce(serverData("TextField"));
            const refetched = await store.fetchModelInfo(args);
            expect(fetchHelper).toHaveBeenCalledTimes(2);
            expect(refetched.fields.title.typeDb).toBe("TextField");
        });

        scopedIt("does not cache an error that arrives after the clear", async () => {
            const args = { app: "blog", model: "post" };
            const key = getAppModelDotName(args);
            let rejectFetch;
            fetchHelper.mockReturnValueOnce(
                new Promise((resolve, reject) => {
                    rejectFetch = reject;
                }),
            );

            const inFlight = store.fetchModelInfo(args);
            store.clearAuthScoped();
            rejectFetch(new storeModule.ModelInfoError("Forbidden"));

            await expect(inFlight).rejects.toThrow("Forbidden");
            expect(store.errors[key]).toBeUndefined();

            fetchHelper.mockResolvedValueOnce(serverData("CharField"));
            await store.fetchModelInfo(args);
            expect(fetchHelper).toHaveBeenCalledTimes(2);
        });
    });
});
