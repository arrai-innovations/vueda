import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName, getAppModelViewDotName } from "@vueda/utils/crudSupport.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import identity from "lodash-es/identity.js";
import { defineStore } from "pinia";

/**
 * A configuration object for making use of a model client-side.
 *
 * @typedef {object} ModelConfig
 * @property {string} verboseName - the human-readable name of the model
 * @property {string} verboseNamePlural - the human-readable plural name of the model
 * @property {string[]} fields - field names to display by default
 * @property {string[]} expands - field names to expand by default
 * @property {string[]} routeActions - actions to configure routes for
 * @property {string[]} actions - actions to display by default
 * @property {string[]} filterables - filters to display in list view
 * @property {string[]} sortables - field names that can be sorted in list view
 * @property {string[]} sorted - the default sort order for list view
 * @property {{fieldName: import('@vueda/stores/storeModelInfo.js').FieldInfo}} fieldDetails - each available field details, by field name
 * @property {{expandName: import('@vueda/stores/storeModelInfo.js').ExpandInfo}} expandDetails - each available expand details, by expand name
 * @property {{actionName: import('@vueda/stores/storeModelInfo.js').ActionInfo}} actionDetails - each available action details, by action name
 * @property {{filterName: import('@vueda/stores/storeModelInfo.js').FilterInfo}} filterableDetails - each available filter details, by filter name
 * @property {object} formProps - extra props to pass the form model
 * @property {object} fieldProps - extra props to pass a field component in a form model
 * @property {object} widgetProps - extra props to pass a widget component in a form model
 */

/**
 * A partial configuration object for making use of a model client-side.
 *
 * @typedef {object} OverridingModelConfig
 * @property {string[]} [fields] - field names to display by default
 * @property {string[]} [expands] - field names to expand by default
 * @property {string[]} [routeActions] - actions to configure routes for
 * @property {string[]} [actions] - actions to display by default
 * @property {string[]} [filterables] - filters to display in list view
 * @property {string[]} [sortables] - field names that can be sorted in list view
 * @property {string[]} [sorted] - the default sort order for list view
 * @property {{fieldName: import('@vueda/stores/storeModelInfo.js').FieldInfo}} [fieldDetails] - each available field details, by field name
 * @property {{expandName: import('@vueda/stores/storeModelInfo.js').ExpandInfo}} [expandDetails] - each available expand details, by expand name
 * @property {{actionName: import('@vueda/stores/storeModelInfo.js').ActionInfo}} [actionDetails] - each available action details, by action name
 * @property {{filterName: import('@vueda/stores/storeModelInfo.js').FilterInfo}} [filterableDetails] - each available filter details, by filter name
 * @property {object} [formProps] - extra props to pass the form model
 * @property {object} [fieldProps] - extra props to pass a field component in a form model
 * @property {object} [widgetProps] - extra props to pass a widget component in a form model
 */

/**
 * Get a default configuration object for a model based on model info.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').ModelInfo} modelInfo - The model info to base the configuration on.
 * @returns {[generic:ModelConfig, {[view: string]: OverridingModelConfig}]} The default configuration objects.
 */
const getDefaultFromModelInfo = (modelInfo) => {
    const pkField = modelInfo.pk;
    const fields = Object.keys(modelInfo.fields).filter((f) => f !== pkField);
    const expandFields = modelInfo.expands.map((e) => e.name);
    const actionDetailsByName = Object.fromEntries(modelInfo.actions.map((a) => [a.name, a]));
    const expandDetailsByName = Object.fromEntries(modelInfo.expands.map((e) => [e.name, e]));
    return [
        {
            verboseName: modelInfo.verbose_name,
            verboseNamePlural: modelInfo.verbose_name_plural,
            fields,
            expands: expandFields,
            routeActions: modelInfo.actions.map((a) => a.name),
            actions: modelInfo.actions.map((a) => a.name),
            filterables: Object.keys(modelInfo.filtering),
            sortables: modelInfo.ordering.map((o) => o.name),
            sorted: [], // todo: the server has default field(s) being sorted on, we should get that
            fieldDetails: cloneDeep(modelInfo.fields),
            expandDetails: cloneDeep(expandDetailsByName),
            actionDetails: cloneDeep(actionDetailsByName),
            filterableDetails: cloneDeep(modelInfo.filtering),
            sortablesDetails: cloneDeep(modelInfo.ordering),
            formProps: {},
            fieldProps: {},
            widgetProps: {},
        },
        {},
    ];
};

/**
 * A store for model configuration.
 *
 * @returns {import('pinia').Store<
 *     'modelConfig',
 *     {
 *         genericConfigs: {[key: string]: ModelConfig},
 *         specificConfigs: {[key: string]: OverridingModelConfig},
 *         builtConfigs: {[key: string]: ModelConfig},
 *         initailized: {[key: string]: Promise<ModelConfig>},
 *     },
 *     {
 *         setConfig: (
 *             {app: string, model: string},
 *             genericConfig: OverridingModelConfig=null,
 *             specificConfigs: {[view: string]: OverridingModelConfig}=null
 *         ) => void,
 *         getConfig: (app: string, model: string) => Promise<ModelConfig>,
 *     }
 * >}
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
                // if there are any detail field overrides, we need to merge them at the detail property level
                for (const detailName of [
                    "fieldDetails",
                    "expandDetails",
                    "actionDetails",
                    "filterableDetails",
                    "sortableDetails",
                ]) {
                    const defaultGenericDetails = defaultGenericConfig[detailName] || {};
                    const genericDetails = genericConfig?.[detailName] || {};
                    const defaultSpecificDetails = defaultSpecificConfigs[view]?.[detailName] || {};
                    const specificDetails = specificConfig?.[detailName] || {};
                    if (
                        [defaultGenericDetails, genericDetails, defaultSpecificDetails, specificDetails].filter(
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
