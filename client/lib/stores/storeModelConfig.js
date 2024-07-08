import { getPermissionCase } from "../utils/crudSupport.js";
import { storeModelInfo } from "./storeModelInfo.js";
import { defineStore } from "pinia";

/**
 * Get a key for a model.
 *
 * @param {string} app - The app name.
 * @param {string} model - The model name.
 * @returns {string} The key.
 * @private
 */
const getKey = (app, model) => {
    return `${getPermissionCase(app)}.${getPermissionCase(model)}`;
};

/**
 * A list of field names or sub-containers to display.
 *
 * @typedef {(string|FieldLayout)[]} FieldsOrLayout
 */

/**
 * A layout for displaying fields.
 *
 * @typedef {object} FieldLayout
 * @property {string} containerClasses - CSS classes to apply to the container.
 * @property {FieldsOrLayout} fields - The field names or sub-containers to display.
 */

/**
 * A configuration object for making use of a model client-side.
 *
 * @typedef {object} ModelConfig
 * @property {string[]} listFields - field names to display in list view
 * @property {FieldsOrLayout} createFields - field names to display in a create form model
 * @property {FieldsOrLayout} updateFields - field names to display in an update form model
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
 * @param {import('../').ModelInfo} modelInfo - The model info to base the configuration on.
 * @returns {ModelConfig} The default configuration object.
 */
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
            this.configs[getKey(app, model)] = config;
            delete this.builtConfigs[getKey(app, model)];
        },
        async getConfig(app, model) {
            if (this.builtConfigs[getKey(app, model)]) {
                return this.builtConfigs[getKey(app, model)];
            }
            const modelInfoStore = storeModelInfo();
            const modelInfo = await modelInfoStore.fetchModelInfo(app, model);
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
