import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName, getAppModelViewDotName } from "@vueda/utils/crudSupport.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import identity from "lodash-es/identity.js";
import { defineStore } from "pinia";

// todo: ModelConfig type is out of date
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
 * @returns {[generic:ModelConfig, {[view: string]: ModelConfig}]} The default configuration objects.
 */
const getDefaultFromModelInfo = (modelInfo) => {
    const actionDetailsByName = modelInfo.actions.reduce((acc, action) => {
        acc[action.name] = action;
        return acc;
    });
    return [
        {
            fieldDetails: cloneDeep(modelInfo.fields),
            fields: Object.keys(modelInfo.fields),
            expands: [],
            actionDetails: cloneDeep(actionDetailsByName),
            routeActions: modelInfo.actions.map((a) => a.name),
            actions: modelInfo.actions.map((a) => a.name),
            formProps: {},
            fieldProps: {},
            widgetProps: {},
        },
        {
            list: {
                filterable: Object.keys(modelInfo.filtering),
                sortable: modelInfo.ordering.map((o) => o.name),
                sorted: [], // todo: the server has default field(s) being sorted on, we should get that
            },
        },
    ];
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
                const [defaultGenericConfig, defaultSpecificConfigs] = getDefaultFromModelInfo(modelInfo);
                // clone to avoid mutation of original configs
                const genericConfig = cloneDeep(this.genericConfigs[genericKey] || {});
                const specificConfig = specificKey ? cloneDeep(this.specificConfigs[specificKey]) || {} : {};

                const builtConfig = {
                    ...defaultGenericConfig,
                    ...genericConfig,
                    ...(view ? defaultSpecificConfigs[view] || {} : {}),
                    ...specificConfig,
                };
                // if there are any detail field overrides, we need to merge them deeply
                for (const detailName of ["fieldDetails", "actionDetails"]) {
                    const defaultGenericDetails = defaultGenericConfig[detailName] || {};
                    const genericDetails = genericConfig?.[detailName] || {};
                    const defaultSpecificDetails = defaultSpecificConfigs[view]?.[detailName] || {};
                    const specificDetails = specificConfig?.[detailName] || {};
                    if (
                        [defaultGenericDetails || genericDetails || defaultSpecificDetails || specificDetails].filter(
                            identity,
                        ).length > 1
                    ) {
                        const newDetailsObject = {
                            ...defaultGenericDetails,
                        };
                        const configsInPriorityOrder = [genericDetails, defaultSpecificDetails, specificDetails];
                        for (const overridingConfig of configsInPriorityOrder) {
                            for (const fieldName in overridingConfig) {
                                if (fieldName in newDetailsObject) {
                                    newDetailsObject[fieldName] = {
                                        ...newDetailsObject[fieldName],
                                        ...overridingConfig[fieldName],
                                    };
                                } else {
                                    newDetailsObject[fieldName] = overridingConfig[fieldName];
                                }
                            }
                        }
                        builtConfig[detailName] = newDetailsObject;
                    }
                }
                return (this.builtConfigs[builtKey] = builtConfig);
            };
            return this.initialized[builtKey]();
        },
    },
});
