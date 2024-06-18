import storeModelInfo from "@vueda/stores/storeModelInfo.js";
import { getPermissionCase } from "@vueda/utils/crudSupport.js";
import { defineStore } from "pinia";

const getKey = (app, model) => {
    return `${getPermissionCase(app)}.${getPermissionCase(model)}`;
};

const getDefaultFromModelInfo = (modelInfo) => {
    const modelFields = modelInfo.fields.map((f) => f.name);
    const orderableFields = modelInfo.ordering.map((o) => o.name);
    const listActions = modelInfo.actions.filter((a) => a.type === "list").map((a) => a.name);
    const detailActions = modelInfo.actions.filter((a) => a.type === "detail").map((a) => a.name);
    const listFilterable = modelInfo.filtering.map((f) => f.name);
    return {
        listFields: modelFields,
        createFields: modelFields,
        updateFields: modelFields,
        readFields: modelFields,
        listFilterable: listFilterable,
        listSortable: orderableFields,
        listSorted: [], // todo: the server has a default sort order, we should get that
        listActions: listActions,
        detailActions: detailActions,
        createActions: detailActions,
        updateActions: detailActions,
        readActions: detailActions,
    };
};

/**
 * storeConfig - store for model configuration
 *
 * Provide configuration objects for certain models in certain apps to override
 *  how vueda uses the model. Includes:
 *    - listFields - fields to display in list view
 *    - createFields - fields to display in create view
 *    - updateFields - fields to display in update view
 *    - readFields - fields to display in read view
 *    - listFilters - filters to display in list view
 *    - listSortable - fields that can be sorted in list view
 *    - listSorted - the default sort order for list view
 *    - listActions - actions to display in list view
 *    - detailActions - actions to display in detail view
 *    - createActions - actions to display in create view
 *    - updateActions - actions to display in update view
 *    - readActions - actions to display in read view
 *
 * Provided names are checked against server data as it is loaded, and
 *  we will log warnings for invalid field or action names. Since this works on
 *  other sources loading modelInfo, we can't complain about invalid app or model names.
 */
export default defineStore({
    id: "configStore",
    state: () => ({
        configs: {},
        builtConfigs: {},
    }),
    actions: {
        setConfig(app, model, config) {
            this.configs[getKey(app, model)] = config;
            delete this.builtConfigs[getKey(app, model)];
        },
        async getConfig(app, model) {
            if (this.builtConfigs[getKey(app, model)]) {
                return this.builtConfigs[getKey(app, model)];
            }
            const modelInfoStore = storeModelInfo();
            const modelInfo = await modelInfoStore.fetchModelInfo(app, model);
            console.log("modelInfo", modelInfo);
            return (this.builtConfigs[getKey(app, model)] = {
                ...getDefaultFromModelInfo(modelInfo),
                ...this.configs[getKey(app, model)],
            });
        },
        updateConfig(app, model, config) {
            // partially update config
            const key = getKey(app, model);
            if (!this.configs[key]) {
                this.configs[key] = {};
            }
            for (const [k, v] of Object.entries(config)) {
                this.configs[key][k] = v;
            }
        },
    },
});
