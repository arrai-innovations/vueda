import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import { defineStore } from "pinia";

/**
 * A configuration object for making use of a model client-side.
 *
 * @typedef {object} ModelConfig
 * @property {string[]} listFields - field names to display in list view
 * @property {string[]} createFields - field names to display in a create form model
 * @property {string[]} updateFields - field names to display in an update form model
 * @property {string[]} readFields - field names to display in read view
 * @property {string[]} listFilterable - filters to display in list view
 * @property {string[]} listSortable - field names that can be sorted in list view
 * @property {string[]} listSorted - the default sort order for list view
 * @property {string[]} listActions - actions to display in list view
 * @property {string[]} detailActions - actions to display in detail view
 * @property {string[]} createActions - actions to display in create view
 * @property {string[]} updateActions - actions to display in update view
 * @property {string[]} readActions - actions to display in read view
 */

/**
 * Get a default configuration object for a model based on model info.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').ModelInfo} modelInfo - The model info to base the configuration on.
 * @returns {ModelConfig} The default configuration object.
 */
const getDefaultFromModelInfo = (modelInfo) => {
    const modelFields = modelInfo.fields.map((f) => f.name);
    const orderableFields = modelInfo.ordering.map((o) => o.name);
    const listActions = modelInfo.actions.filter((a) => !a.detail).map((a) => a.name);
    const detailActions = modelInfo.actions.filter((a) => a.detail).map((a) => a.name);
    const listFilterable = modelInfo.filtering.map((f) => f.name);
    return {
        listFields: modelFields,
        createFields: modelFields,
        updateFields: modelFields,
        readFields: modelFields,
        listFilterable: listFilterable,
        listSortable: orderableFields,
        listSorted: [], // todo: the server has default field(s) being sorted on, we should get that
        listActions: listActions,
        detailActions: detailActions,
        createActions: detailActions,
        updateActions: detailActions,
        readActions: detailActions,
    };
};

/**
 * A store for model configuration.
 *
 * @returns {import('pinia').Store<{
 *     configs: {[key: string]: ModelConfig},
 *     builtConfigs: {[key: string]: ModelConfig},
 *     setConfig: (app: string, model: string, config: ModelConfig) => void,
 *     getConfig: (app: string, model: string) => Promise<ModelConfig>,
 *     updateConfig: (app: string, model: string, config: Partial<ModelConfig>) => void
 * }>}
 *
 */
export const storeModelConfig = defineStore({
    id: "configStore",
    state: () => ({
        configs: {},
        builtConfigs: {},
    }),
    actions: {
        setConfig(app, model, config) {
            this.configs[getAppModelDotName(app, model)] = config;
            delete this.builtConfigs[getAppModelDotName(app, model)];
        },
        async getConfig(app, model) {
            if (this.builtConfigs[getAppModelDotName(app, model)]) {
                return this.builtConfigs[getAppModelDotName(app, model)];
            }
            const modelInfoStore = storeModelInfo();
            await modelInfoStore.fetchModelInfo(app, model);
            const modelInfo = modelInfoStore.modelInfos[getAppModelDotName(app, model)];
            return (this.builtConfigs[getAppModelDotName(app, model)] = {
                ...getDefaultFromModelInfo(modelInfo),
                ...this.configs[getAppModelDotName(app, model)],
            });
        },
        updateConfig(app, model, config) {
            // partially update config
            const key = getAppModelDotName(app, model);
            if (!this.configs[key]) {
                this.configs[key] = {};
            }
            for (const [k, v] of Object.entries(config)) {
                this.configs[key][k] = v;
            }
        },
    },
});
