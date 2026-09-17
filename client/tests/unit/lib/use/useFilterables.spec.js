import { scopedIt, withSetup } from "@tests/unit/utils.js";
import { nextTick, reactive } from "vue";

describe("lib/use/useFilterables.js", () => {
    let useFilterables;
    beforeEach(async () => {
        useFilterables = (await import("@vueda/use/useFilterables.js")).useFilterables;
    });

    scopedIt("resolves filterables/filterableDetails from model config when no overrides are given", async () => {
        const modelConfig = reactive({
            config: {
                filterables: ["status"],
                filterableDetails: { status: { typeFilter: "CharField" } },
            },
        });
        const props = reactive({ filterables: null, filterableDetails: null });
        const state = await withSetup(() => useFilterables(modelConfig, props));
        await nextTick();

        expect(state.filterables).toEqual(["status"]);
        expect(state.filterableDetails).toEqual({ status: { typeFilter: "CharField" } });
    });

    scopedIt("lets the filterables prop override the model config's declared list", async () => {
        const modelConfig = reactive({
            config: {
                filterables: ["status", "name"],
                filterableDetails: {
                    status: { typeFilter: "CharField" },
                    name: { typeFilter: "CharField" },
                },
            },
        });
        const props = reactive({ filterables: ["status"], filterableDetails: null });
        const state = await withSetup(() => useFilterables(modelConfig, props));
        await nextTick();

        expect(state.filterables).toEqual(["status"]);
    });

    scopedIt("merges the filterableDetails prop over the model config's per-field details", async () => {
        const modelConfig = reactive({
            config: {
                filterables: ["status"],
                filterableDetails: { status: { typeFilter: "CharField", label: "Status" } },
            },
        });
        const props = reactive({ filterables: null, filterableDetails: { status: { label: "Custom" } } });
        const state = await withSetup(() => useFilterables(modelConfig, props));
        await nextTick();

        expect(state.filterableDetails.status).toEqual({ typeFilter: "CharField", label: "Custom" });
    });

    scopedIt("omits fields with no detail from either the model config or the override", async () => {
        const modelConfig = reactive({
            config: {
                filterables: ["status", "unknown"],
                filterableDetails: { status: { typeFilter: "CharField" } },
            },
        });
        const props = reactive({ filterables: null, filterableDetails: null });
        const state = await withSetup(() => useFilterables(modelConfig, props));
        await nextTick();

        expect(state.filterableDetails).toEqual({ status: { typeFilter: "CharField" } });
        expect(state.filterableDetails.unknown).toBeUndefined();
    });

    scopedIt("does not resolve until the model config's filterableDetails are populated", async () => {
        const modelConfig = reactive({ config: { filterables: [], filterableDetails: {} } });
        const props = reactive({ filterables: null, filterableDetails: null });
        const state = await withSetup(() => useFilterables(modelConfig, props));
        await nextTick();
        expect(state.filterables).toEqual([]);

        modelConfig.config.filterables = ["status"];
        modelConfig.config.filterableDetails = { status: { typeFilter: "CharField" } };
        await nextTick();

        expect(state.filterables).toEqual(["status"]);
        expect(state.filterableDetails).toEqual({ status: { typeFilter: "CharField" } });
    });

    scopedIt("writes into a caller-provided state object in place", async () => {
        const modelConfig = reactive({
            config: { filterables: ["status"], filterableDetails: { status: { typeFilter: "CharField" } } },
        });
        const props = reactive({ filterables: null, filterableDetails: null });
        const ownState = reactive({ filterables: [], filterableDetails: {} });
        await withSetup(() => useFilterables(modelConfig, props, ownState));
        await nextTick();

        expect(ownState.filterables).toEqual(["status"]);
        expect(ownState.filterableDetails).toEqual({ status: { typeFilter: "CharField" } });
    });

    scopedIt("returns a readonly view", async () => {
        const modelConfig = reactive({
            config: { filterables: ["status"], filterableDetails: { status: { typeFilter: "CharField" } } },
        });
        const props = reactive({ filterables: null, filterableDetails: null });
        const state = await withSetup(() => useFilterables(modelConfig, props));
        await nextTick();

        expect(() => {
            state.filterables = ["other"];
        }).not.toThrow();
        // Vue's readonly() warns and no-ops on external writes rather than throwing.
        expect(state.filterables).toEqual(["status"]);
    });
});
