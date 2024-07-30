import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import { defineStore } from "pinia";

/**
 * A configuration object for making use of a model client-side.
 *
 * @typedef {object} ModelConfig
 * @property {string[]} listFields - field names to display in list view
 * @property {string[]} listExpands - field names to expand in list view
 * @property {string[]} createFields - field names to display in a create form model
 * @property {string[]} createExpands - field names to expand in create form model
 * @property {string[]} updateFields - field names to display in an update form model
 * @property {string[]} updateExpands - field names to expand in update form model
 * @property {string[]} readFields - field names to display in read view
 * @property {string[]} readExpands - field names to expand in read view
 * @property {string[]} listFilterable - filters to display in list view
 * @property {string[]} listSortable - field names that can be sorted in list view
 * @property {string[]} listSorted - the default sort order for list view
 * @property {string[]} listActions - actions to display in list view
 * @property {string[]} detailActions - actions to display in detail view
 * @property {string[]} createActions - actions to display in create view
 * @property {string[]} updateActions - actions to display in update view
 * @property {string[]} readActions - actions to display in read view
 * @property {{[propName: string]: any}} createFormProps - extra props to pass the form model for view create
 * @property {{[propName: string]: any}} updateFormProps - extra props to pass the form model for view update
 * @property {{[fieldPath: string]: {[propName: string]: any}}} createFieldProps - extra props to pass a field component in a form model for view create
 * @property {{[fieldPath: string]: {[propName: string]: any}}} updateFieldProps - extra props to pass a field component in a form model for view update
 * @property {{[fieldPath: string]: {[propName: string]: any}}} createWidgetProps - extra props to pass a widget component in a form model for view create
 * @property {{[fieldPath: string]: {[propName: string]: any}}} updateWidgetProps - extra props to pass a widget component in a form model for view update
 */

/**
 * Get a default configuration object for a model based on model info.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').ModelInfo} modelInfo - The model info to base the configuration on.
 * @returns {ModelConfig} The default configuration object.
 */
const getDefaultFromModelInfo = (modelInfo) => {
    const modelFields = Object.keys(modelInfo.fields);
    const orderableFields = modelInfo.ordering.map((o) => o.name);
    const listActions = modelInfo.actions.filter((a) => !a.detail).map((a) => a.name);
    const detailActions = modelInfo.actions.filter((a) => a.detail).map((a) => a.name);
    const listFilterable = modelInfo.filtering.map((f) => f.name);
    return {
        listFields: modelFields,
        listExpands: [],
        createFields: modelFields,
        createExpands: [],
        updateFields: modelFields,
        updateExpands: [],
        readFields: modelFields,
        readExpands: [],
        listFilterable: listFilterable,
        listSortable: orderableFields,
        listSorted: [], // todo: the server has default field(s) being sorted on, we should get that
        listActions: listActions,
        detailActions: detailActions,
        createActions: detailActions,
        updateActions: detailActions,
        readActions: detailActions,
        createFormProps: {},
        updateFormProps: {},
        createFieldProps: {},
        updateFieldProps: {},
        createWidgetProps: {},
        updateWidgetProps: {},
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
    id: "config",
    state: () => ({
        configs: {},
        builtConfigs: {},
    }),
    actions: {
        setConfig(app, model, config) {
            this.configs[getAppModelDotName({ app, model })] = config;
            delete this.builtConfigs[getAppModelDotName({ app, model })];
        },
        async getConfig(app, model) {
            if (this.builtConfigs[getAppModelDotName({ app, model })]) {
                return this.builtConfigs[getAppModelDotName({ app, model })];
            }
            const modelInfoStore = storeModelInfo();
            await modelInfoStore.fetchModelInfo(app, model);
            const modelInfo = modelInfoStore.modelInfos[getAppModelDotName({ app, model })];
            return (this.builtConfigs[getAppModelDotName({ app, model })] = {
                ...getDefaultFromModelInfo(modelInfo),
                ...this.configs[getAppModelDotName({ app, model })],
            });
        },
        updateConfig(app, model, config) {
            // partially update config
            const key = getAppModelDotName({ app, model });
            if (!this.configs[key]) {
                this.configs[key] = {};
            }
            for (const [k, v] of Object.entries(config)) {
                this.configs[key][k] = v;
            }
        },
    },
});
