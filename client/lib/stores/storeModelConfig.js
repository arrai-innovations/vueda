import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName, getAppModelViewDotName } from "@vueda/utils/crudSupport.js";
import cloneDeep from "lodash-es/cloneDeep.js";
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
 * @property {string[]|null} listActions - allow list of actions to display in list view, otherwise all actions are displayed
 * @property {string[]|null} createActions - allow list of actions to display in create view, otherwise all actions are displayed
 * @property {string[]|null} updateActions - allow list of actions to display in update view, otherwise all actions are displayed
 * @property {string[]|null} readActions - allow list of actions to display in read view, otherwise all actions are displayed
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
    const listFilterable = Object.keys(modelInfo.filtering);
    return {
        fieldDetails: cloneDeep(modelInfo.fields),
        listFieldDetails: cloneDeep(modelInfo.fields),
        createFieldDetails: cloneDeep(modelInfo.fields),
        updateFieldDetails: cloneDeep(modelInfo.fields),
        readFieldDetails: cloneDeep(modelInfo.fields),
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
        routeActions: null, // actions use modelInfo.actions unless overridden
        listActions: null, // actions use modelInfo.actions unless overridden
        createActions: null, // actions use modelInfo.actions unless overridden
        updateActions: null, // actions use modelInfo.actions unless overridden
        readActions: null, // actions use modelInfo.actions unless overridden
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
 *     setConfig: ({app: string, model: string}, genericConfig: ModelConfig=null, specificConfigs: {
 *         [view: string]: ModelConfig
 *     }=null) => void,
 *     getConfig: (app: string, model: string) => Promise<ModelConfig>,
 *     updateConfig: (app: string, model: string, config: Partial<ModelConfig>) => void
 * }>}
 *
 */
export const storeModelConfig = defineStore({
    id: "modelConfig",
    state: () => ({
        genericConfigs: {}, // view-independent configs
        specificConfigs: {}, // view-specific configs
        builtConfigs: {}, // a cache of merged generic and specific configs
        initialized: {}, // a cache of promises for getConfig
    }),
    actions: {
        setConfig({ app, model }, genericConfig = null, specificConfigs = null) {
            if (!app || !model) {
                throw new Error("setConfig requires app and model");
            }
            const genericKey = getAppModelDotName({ app, model });
            if (genericConfig) {
                this.genericConfigs[genericKey] = genericConfig;
            }
            if (specificConfigs) {
                for (const [view, specificConfig] of Object.entries(specificConfigs)) {
                    const key = getAppModelViewDotName({ app, model, view });
                    this.specificConfigs[key] = specificConfig;
                }
            }
            for (const key of Object.keys(this.builtConfigs)) {
                // if the builtConfig is for this app/model, we need to rebuild delete it
                if (key.startsWith(genericKey)) {
                    delete this.builtConfigs[key];
                }
            }
        },
        async getConfig({ app, model, view = null }) {
            if (!app || !model) {
                throw new Error("getConfig requires app and model");
            }
            const args = { app, model, view };
            const genericKey = getAppModelDotName(args);
            const specificKey = view ? getAppModelViewDotName(args) : null;
            const builtKey = specificKey || genericKey;
            if (this.builtConfigs[builtKey]) {
                return this.builtConfigs[builtKey];
            }
            if (this.initialized[builtKey]) {
                return this.initialized[builtKey]();
            }
            this.initialized[builtKey] = async () => {
                const modelInfoStore = storeModelInfo();
                const modelInfo = await modelInfoStore.fetchModelInfo(args);
                const defaultConfig = getDefaultFromModelInfo(modelInfo);
                // clone to avoid mutation of original configs
                const genericConfig = cloneDeep(this.genericConfigs[genericKey] || {});
                const specificConfig = specificKey ? cloneDeep(this.specificConfigs[specificKey]) || {} : {};

                const builtConfig = {
                    ...defaultConfig,
                    ...genericConfig,
                    ...specificConfig,
                };
                // if there is any fieldDetails override, we need to merge them deeply
                const defaultToGeneric = defaultConfig.fieldDetails && genericConfig.fieldDetails;
                const genericToSpecific = genericConfig.fieldDetails && specificConfig.fieldDetails;
                const defaultToSpecific = defaultConfig.fieldDetails && specificConfig.fieldDetails;
                if (defaultToGeneric || genericToSpecific || defaultToSpecific) {
                    const newFieldDetails = {
                        // start with the least priority level
                        ...(defaultConfig.fieldDetails || genericConfig.fieldDetails),
                    };
                    const priorityConfigs = [
                        ...(defaultToGeneric ? [genericConfig.fieldDetails] : []),
                        ...(genericToSpecific || defaultToSpecific ? [specificConfig.fieldDetails] : []),
                    ];
                    for (const priorityConfig in priorityConfigs) {
                        for (const fieldName in priorityConfig) {
                            if (fieldName in newFieldDetails) {
                                newFieldDetails[fieldName] = {
                                    ...newFieldDetails[fieldName],
                                    ...priorityConfig[fieldName],
                                };
                            } else {
                                newFieldDetails[fieldName] = priorityConfig[fieldName];
                            }
                        }
                    }
                    builtConfig.fieldDetails = newFieldDetails;
                }
                return (this.builtConfigs[builtKey] = builtConfig);
            };
            return this.initialized[builtKey]();
        },
    },
});
