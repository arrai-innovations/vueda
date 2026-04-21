/**
 * @module stores/storeModelConfig
 * @description Pinia store for building, caching, and retrieving merged client-side model configurations from generic and view-specific overrides.
 */
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName, getAppModelViewDotName } from "@vueda/utils/case.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEmpty from "lodash-es/isEmpty.js";
import merge from "lodash-es/merge.js";
import omit from "lodash-es/omit.js";
import { defineStore } from "pinia";

/**
 * Configuration mapping actions to the groups allowed to perform them.
 *
 * @typedef {{
 *     [actionName: string]: [groupNames: string][]
 * }} ActionGroupsConfig
 */

/**
 * Configuration for specifying actions available to a model.
 * Can be either:
 * - A flat list of action names (e.g., `["list", "create"]`)
 * - A group-based configuration mapping actions to allowed groups
 *
 * @typedef {ActionGroupsConfig|string[]} ActionPermissionConfig
 */

/**
 * @typedef {{[fieldName: string]: import('@vueda/stores/storeModelInfo.js').FieldInfo}} FieldDetails
 * @typedef {{[expandName: string]: import('@vueda/stores/storeModelInfo.js').ExpandInfo}} ExpandDetails
 * @typedef {{[actionName: string]: import('@vueda/stores/storeModelInfo.js').ActionInfo}} ActionDetails
 * @typedef {{[filterName: string]: import('@vueda/stores/storeModelInfo.js').FilterInfo}} FilterableDetails
 * @typedef {{[fieldComponentName:string]: import('@vueda/utils/formLookups.js').FieldComponent}} FieldComponents
 * @typedef {{[widgetComponentName:string]: import('@vueda/utils/formLookups.js').WidgetComponent}} WidgetComponents
 */

/**
 * A configuration object for making use of a model client-side.
 *
 * @typedef {object} ModelConfig
 * @property {string} verboseName - the human-readable name of the model
 * @property {string} verboseNamePlural - the human-readable plural name of the model
 * @property {string[]} displayFields - field names to display by default
 * @property {string[]} fetchFields - field names to fetch by default
 * @property {string[]} submitFields - field names to submit on create/update by default
 * @property {string[]} expand - field names to expand by default
 * @property {string[]} routeActions - actions to configure routes for
 * @property {ActionPermissionConfig} actions - actions to display by default
 * @property {string[]} filterables - filters to display in list view
 * @property {boolean} allowColumnHiding - whether to allow hiding columns in list view
 * @property {boolean} showTotalRecordNum - whether to show total record count in list view
 * @property {boolean} alwaysShowAllPages - whether to always show all pages in list view
 * @property {boolean} allowShowAllPages - whether to allow showing all pages in list view
 * @property {string[]} sortables - field names that can be sorted in list view
 * @property {string[]} sorted - the default sort order for list view
 * @property {{[fieldName: string]: import('@vueda/stores/storeModelInfo.js').FieldInfo}} fieldDetails - each available field details, by field name
 * @property {{[expandName: string]: import('@vueda/stores/storeModelInfo.js').ExpandInfo}} expandDetails - each available expand details, by expand name
 * @property {{[actionName: string]: import('@vueda/stores/storeModelInfo.js').ActionInfo}} actionDetails - each available action details, by action name
 * @property {{[filterName: string]: import('@vueda/stores/storeModelInfo.js').FilterInfo}} filterableDetails - each available filter details, by filter name
 * @property {object} formProps - extra props to pass the form model
 * @property {{[fieldComponentName:string]: import('@vueda/utils/formLookups.js').FieldComponent}} fieldComponents - overriding components for individual fields
 * @property {object} fieldProps - extra props to pass a field component in a form model
 * @property {{[widgetComponentName:string]: import('@vueda/utils/formLookups.js').WidgetComponent}} widgetComponents - overriding components for individual widgets
 * @property {object} widgetProps - extra props to pass a widget component in a form model
 * @property {object} actionRedirects - mapping of action name to destination view
 *  when cancelling or after successful completion. The `default` key is used
 *  when no action-specific redirect exists. Values can be strings or functions
 *  receiving `{bulk, result}` and returning a view name.
 */

/**
 * A partial configuration object for making use of a model client-side.
 *
 * @typedef {object} OverridingModelConfig
 * @property {string} [verboseName] - the human-readable name of the model
 * @property {string} [verboseNamePlural] - the human-readable plural name of the model
 * @property {string[]} [displayFields] - field names to display by default
 * @property {string[]} [fetchFields] - field names to fetch by default
 * @property {string[]} [submitFields] - field names to submit on create/update by default
 * @property {string[]} [expand] - field names to expand by default
 * @property {string[]} [routeActions] - actions to configure routes for
 * @property {ActionPermissionConfig} [actions] - actions to display by default
 * @property {string[]} [filterables] - filters to display in list view
 * @property {string[]} [sortables] - field names that can be sorted in list view
 * @property {string[]} [sorted] - the default sort order for list view
 * @property {{[fieldName: string]: import('@vueda/stores/storeModelInfo.js').FieldInfo}} [fieldDetails] - each available field details, by field name
 * @property {{[expandName: string]: import('@vueda/stores/storeModelInfo.js').ExpandInfo}} [expandDetails] - each available expand details, by expand name
 * @property {{[actionName: string]: import('@vueda/stores/storeModelInfo.js').ActionInfo}} [actionDetails] - each available action details, by action name
 * @property {{[filterName: string]: import('@vueda/stores/storeModelInfo.js').FilterInfo}} [filterableDetails] - each available filter details, by filter name
 * @property {object} [formProps] - extra props to pass the form model
 * @property {boolean} allowColumnHiding - whether to allow hiding columns in list view
 * @property {boolean} showTotalRecordNum - whether to show total record count in list view
 * @property {boolean} alwaysShowAllPages - whether to always show all pages in list view
 * @property {boolean} allowShowAllPages - whether to allow showing all pages in list view
 * @property {{[fieldComponentName:string]: import('@vueda/utils/formLookups.js').FieldComponent}} [fieldComponents] - overriding components for individual fields
 * @property {object} [fieldProps] - extra props to pass a field component in a form model
 * @property {{[widgetComponentName:string]: import('@vueda/utils/formLookups.js').WidgetComponent}} [widgetComponents] - overriding components for individual widgets
 * @property {object} [widgetProps] - extra props to pass a widget component in a form model
 * @property {object} [actionRedirects] - action-specific redirect mapping to merge with defaults.
 */

/**
 * Get a default configuration object for a model based on model info.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').ModelInfo} modelInfo - The model info to base the configuration on.
 * @returns {[ModelConfig, {[view: string]: OverridingModelConfig}]} The default configuration objects.
 */
const getDefaultFromModelInfo = (modelInfo) => {
    if (!modelInfo || !modelInfo.fields || !modelInfo.expand || !modelInfo.actions) {
        return [
            {
                formProps: {},
                fieldComponents: {},
                fieldProps: {},
                widgetComponents: {},
                widgetProps: {},
                actionDetails: {},
                fieldDetails: {},
                filterableDetails: {},
                sortableDetails: {},
            },
            {},
        ];
    }
    const pkField = modelInfo.pk;
    const fields = Object.keys(modelInfo.fields).filter((f) => f !== pkField && !modelInfo.fields[f]?.hidden);
    const expandFields = modelInfo.expand.map((e) => e.name);
    const actionDetailsByName = Object.fromEntries(modelInfo.actions.map((a) => [a.name, a]));
    const expandDetailsByName = Object.fromEntries(modelInfo.expand.map((e) => [e.name, e]));
    const actionNames = modelInfo.actions.map((a) => a.name);
    const canUpdate = actionNames.includes("update");
    const canRetrieve = actionNames.includes("retrieve");
    const canList = actionNames.includes("list");
    return [
        {
            verboseName: modelInfo.verbose_name,
            verboseNamePlural: modelInfo.verbose_name_plural,
            displayFields: fields,
            fetchFields: fields,
            submitFields: fields,
            expand: expandFields,
            routeActions: modelInfo.actions.map((a) => a.name),
            actions: modelInfo.actions.map((a) => a.name),
            filterables: Object.keys(modelInfo.filtering || {}),
            sortables: (modelInfo.ordering || []).map((o) => o.name),
            sorted: [], // todo: the server has default field(s) being sorted on, we should get that
            fieldDetails: cloneDeep(modelInfo.fields),
            expandDetails: cloneDeep(expandDetailsByName),
            actionDetails: cloneDeep(actionDetailsByName),
            filterableDetails: cloneDeep(modelInfo.filtering || {}),
            sortablesDetails: cloneDeep(modelInfo.ordering || []),
            formProps: {},
            allowColumnHiding: false,
            showTotalRecordNum: true,
            alwaysShowAllPages: false,
            allowShowAllPages: true,
            fieldComponents: {},
            fieldProps: {},
            widgetComponents: {},
            widgetProps: {},
            actionRedirects: {
                default: canUpdate ? "update" : canRetrieve ? "read" : canList ? "list" : null,
            },
        },
        {},
    ];
};

const shallowObjectProperties = ["formProps", "fieldComponents", "widgetComponents", "actionRedirects"];
const deepObjectProperties = [
    "fieldDetails",
    "actionDetails",
    "filterableDetails",
    "sortableDetails",
    "fieldProps",
    "widgetProps",
];
const nonSimpleProperties = [...shallowObjectProperties, "expandDetails", ...deepObjectProperties];

/**
 * Merge view-specific and generic configurations for simple properties,
 * where properties such as displayFields, fetchFields, submitFields, routeActions,
 * filterables, sortables, and sorted are merged.
 *
 * @param {ModelConfig} defaultGenericConfig - The default (generic) configuration.
 * @param {OverridingModelConfig} customGenericConfig - The view-independent overriding configuration.
 * @param {OverridingModelConfig} defaultSpecificConfig - The default view-specific configuration.
 * @param {OverridingModelConfig} customSpecificConfig - The view-specific overriding configuration.
 * @returns {ModelConfig} The merged configuration for simple properties.
 */
const mergeSimpleProperties = (
    defaultGenericConfig,
    customGenericConfig,
    defaultSpecificConfig,
    customSpecificConfig,
) => {
    const configs = [customGenericConfig, defaultSpecificConfig, customSpecificConfig];
    const mergedConfig = omit(defaultGenericConfig, [
        ...nonSimpleProperties,
        "displayFields",
        "fetchFields",
        "submitFields",
    ]);
    for (const config of configs) {
        for (const [key, value] of Object.entries(config)) {
            if (!nonSimpleProperties.includes(key)) {
                mergedConfig[key] = value;
            }
        }
    }

    for (const fieldKey of ["displayFields", "fetchFields", "submitFields"]) {
        // use fields if displayFields, fetchFields, and submitFields are not set
        if (!mergedConfig[fieldKey] || mergedConfig[fieldKey].length === 0) {
            if (mergedConfig.fields) {
                mergedConfig[fieldKey] = mergedConfig.fields;
            } else if (defaultGenericConfig[fieldKey]) {
                mergedConfig[fieldKey] = defaultGenericConfig[fieldKey];
            }
        }
    }

    // merge shallow object properties
    for (const objectKey of shallowObjectProperties) {
        mergedConfig[objectKey] = merge({}, defaultGenericConfig[objectKey], ...configs.map((c) => c[objectKey]));
    }

    return mergedConfig;
};

/**
 * Merge and flatten expansion details into fieldDetails using double-underscore keys.
 *
 * This function processes expandable field configurations by combining the expandDetails
 * from various configuration sources and then mapping them into the fieldDetails object.
 * The process ensures that:
 *
 * 1. For each expansion name listed in builtConfig.expand:
 *    - It deep merges the expansion configuration from:
 *         • defaultGenericConfig.expandDetails[expandName]
 *         • customGenericConfig.expandDetails[expandName]
 *         • defaultSpecificConfig.expandDetails[expandName]
 *         • customSpecificConfig.expandDetails[expandName]
 *      Custom settings override defaults on a key-by-key basis.
 *
 * 2. The merged expansion configuration is then used to:
 *    a. Replace the expansion's own entry in fieldDetails (i.e. fieldDetails[expandName])
 *       with a clone of the merged configuration, omitting the "f" (sub-fields) property.
 *
 *    b. Iterate over each sub-field defined in the merged expandDetails.f.
 *       For each sub-field, a flattened key is created using the pattern
 *       "expandName__subFieldName". The default configuration for this sub-field comes
 *       from the merged expandDetails.f, and any custom overrides provided via
 *       customGenericConfig.fieldDetails or customSpecificConfig.fieldDetails for that key
 *       are merged in.
 *
 * 3. Finally, the builtConfig object is updated with the new fieldDetails (including
 *    the flattened expansion fields) and the merged expandDetails.
 *
 * This approach allows the default expandable field configurations (as provided by
 * drf-flex-fields) to be customized via expandDetails, while also permitting direct
 * overrides in fieldDetails for the flattened keys.
 *
 * @param {ModelConfig} builtConfig - The built configuration object, which is mutated in place.
 * @param {ModelConfig} defaultGenericConfig - The default (generic) configuration.
 * @param {OverridingModelConfig} customGenericConfig - The view-independent overriding configuration.
 * @param {OverridingModelConfig} defaultSpecificConfig - The default view-specific configuration.
 * @param {OverridingModelConfig} customSpecificConfig - The view-specific overriding configuration.
 */
const flattenExpansionDetails = (
    builtConfig,
    defaultGenericConfig,
    customGenericConfig,
    defaultSpecificConfig,
    customSpecificConfig,
) => {
    const expanded = builtConfig.expand || [];
    if (isEmpty(expanded)) {
        return;
    }

    const fieldDetails = builtConfig.fieldDetails || {};
    const expandDetails = builtConfig.expandDetails || {};

    for (const expandName of expanded) {
        const defaultGenericExpand = defaultGenericConfig.expandDetails?.[expandName] || {};
        const defaultGenericFieldDetail = defaultGenericConfig.fieldDetails?.[expandName] || {};
        const customGenericExpand = customGenericConfig?.expandDetails?.[expandName] || {};
        const defaultSpecificExpand = defaultSpecificConfig.expandDetails?.[expandName] || {};
        const customSpecificExpand = customSpecificConfig?.expandDetails?.[expandName] || {};
        const newExpandDetails = {
            ...defaultGenericFieldDetail,
            ...defaultGenericExpand,
        };
        const configsInPriorityOrder = [customGenericExpand, defaultSpecificExpand, customSpecificExpand];

        // merge the expand details
        // keys of f merge, all other keys replace, as we expect non object values

        for (const overridingConfig of configsInPriorityOrder) {
            for (const key of Object.keys(overridingConfig)) {
                if (key === "f") {
                    if (!newExpandDetails.f) {
                        newExpandDetails.f = {};
                    }
                    for (const fieldName in overridingConfig.f) {
                        if (fieldName in newExpandDetails.f) {
                            newExpandDetails.f[fieldName] = merge(
                                newExpandDetails.f[fieldName],
                                overridingConfig.f[fieldName],
                            );
                        } else {
                            newExpandDetails.f[fieldName] = overridingConfig.f[fieldName];
                        }
                    }
                } else {
                    newExpandDetails[key] = overridingConfig[key];
                }
            }
        }
        expandDetails[expandName] = newExpandDetails;
        fieldDetails[expandName] = cloneDeep(omit(newExpandDetails, ["f"]));

        for (const [fieldName, expandFDetails] of Object.entries(newExpandDetails.f || {})) {
            const expandedFieldName = `${expandName}__${fieldName}`;
            // any defaults are replaced by the expand details
            // but custom overrides are still merged
            const customGenericFieldDetails = customGenericConfig?.fieldDetails?.[expandedFieldName] || {};
            const customSpecificFieldDetails = customSpecificConfig?.fieldDetails?.[expandedFieldName] || {};
            fieldDetails[expandedFieldName] = {
                ...expandFDetails,
                ...customGenericFieldDetails,
                ...customSpecificFieldDetails,
            };
        }
    }
    builtConfig.fieldDetails = fieldDetails;
    builtConfig.expandDetails = expandDetails;
};

/**
 * Merge view-specific and generic configurations for deep (non-simple) properties.
 *
 * For each key in nonSimpleProperties, perform a deep merge of the generic config and view-specific config.
 * Special handling is provided for "expandDetails": rather than a straight merge, this function should
 * flatten the expansion details (by calling flattenExpansionDetails) and then merge them into the unified field details.
 *
 * @param {ModelConfig} builtConfig - The built configuration object, so far. Will be mutated in place.
 * @param {ModelConfig} defaultGenericConfig - The default (generic) configuration.
 * @param {OverridingModelConfig} customGenericConfig - The view-independent overriding configuration.
 * @param {OverridingModelConfig} defaultSpecificConfig - The default view-specific configuration.
 * @param {OverridingModelConfig} customSpecificConfig - The view-specific overriding configuration.
 */
const mergeDeepProperties = (
    builtConfig,
    defaultGenericConfig,
    customGenericConfig,
    defaultSpecificConfig,
    customSpecificConfig,
) => {
    for (const detailName of deepObjectProperties) {
        const defaultGenericDetails = defaultGenericConfig[detailName] || {};
        const genericDetails = customGenericConfig?.[detailName] || {};
        const defaultSpecificDetails = defaultSpecificConfig[detailName] || {};
        const specificDetails = customSpecificConfig?.[detailName] || {};
        const newDetailsObject = {
            ...defaultGenericDetails,
        };
        const configsInPriorityOrder = [genericDetails, defaultSpecificDetails, specificDetails];
        for (const overridingConfig of configsInPriorityOrder) {
            for (const fieldName in overridingConfig) {
                if (fieldName in newDetailsObject) {
                    newDetailsObject[fieldName] = merge(newDetailsObject[fieldName], overridingConfig[fieldName]);
                } else {
                    newDetailsObject[fieldName] = overridingConfig[fieldName];
                }
            }
        }
        builtConfig[detailName] = newDetailsObject;
    }
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
 *         initialized: {[key: string]: import('@vueda/utils/fetchSupport.js').MaybeCancellablePromise<ModelConfig>},
 *     },
 *     {
 *         setConfig: (
 *             {app: string, model: string},
 *             genericConfig: OverridingModelConfig=null,
 *             specificConfigs: {[view: string]: OverridingModelConfig}=null
 *         ) => void,
 *         getConfig: (app: string, model: string) => import('@vueda/utils/fetchSupport.js').MaybeCancellablePromise<ModelConfig>,
 *     }
 * >}
 *
 */
export const storeModelConfig = defineStore("modelConfig", {
    state: () => ({
        genericConfigs: {}, // view-independent config overrides
        specificConfigs: {}, // view-specific config overrides
        builtConfigs: {}, // a cache of merged configs, both generic and specific
        initialized: {}, // a cache of promises for getConfig
    }),
    actions: {
        /**
         * Stores generic and view-specific model config overrides.
         * @param {{app: string, model: string}} params - The app and model identifiers.
         * @param {string} params.app - Django app label.
         * @param {string} params.model - Model name.
         * @param {OverridingModelConfig|null} [genericConfig] - Overrides applied to all views.
         * @param {{[view: string]: OverridingModelConfig}|null} [specificConfigs] - Per-view overrides.
         * @returns {void}
         * @example
         * ```js
         * const store = storeModelConfig();
         *
         * store.setConfig(
         *     { app: 'myapp', model: 'Widget' },
         *     // generic (all views)
         *     { displayFields: ['name', 'status'], sortables: ['name'] },
         *     // view-specific overrides
         *     {
         *         list: { displayFields: ['name', 'status', 'created_at'] },
         *         update: { submitFields: ['name', 'status'] },
         *     },
         * );
         * ```
         */
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

            // Cancel in-flight requests for this model
            for (const key of Object.keys(this.initialized)) {
                if (key.startsWith(genericKey) && !this.builtConfigs[key]) {
                    this.initialized[key]?.cancel?.();
                    delete this.initialized[key];
                }
            }

            for (const key of Object.keys(this.builtConfigs)) {
                // if the builtConfig is for this app/model, we need to rebuild delete it
                if (key.startsWith(genericKey)) {
                    delete this.builtConfigs[key];
                }
            }
        },
        getConfig({ app, model, view = null }) {
            if (!app || !model) {
                return Promise.reject(new Error("getConfig requires app and model"));
            }
            const args = { app, model, view };
            const genericKey = getAppModelDotName(args);
            const specificKey = view ? getAppModelViewDotName(args) : null;
            const builtKey = specificKey || genericKey;
            // if we have a cached builtConfig, return it
            if (builtKey in this.builtConfigs) {
                return Promise.resolve(this.builtConfigs[builtKey]);
            }
            // if we are building already for this key, return the promise
            if (builtKey in this.initialized) {
                // initialized values are already promises, wrapping will clobber the cancel method
                return this.initialized[builtKey];
            }

            let promiseCancel = null;

            // otherwise, build the config and cache the promise
            this.initialized[builtKey] = (async () => {
                // clone each to avoid mutation of original configs
                const customGenericConfig = cloneDeep(this.genericConfigs[genericKey] || {});
                const customSpecificConfig = specificKey ? cloneDeep(this.specificConfigs[specificKey]) || {} : {};
                // capture custom before async call so in-flight builds aren't updated by subsequent setConfig calls
                const modelInfoStore = storeModelInfo();
                const modelInfoPromise = modelInfoStore.fetchModelInfo(args);
                if (modelInfoPromise.cancel) {
                    promiseCancel = modelInfoPromise.cancel.bind(modelInfoPromise);
                }
                const modelInfo = await modelInfoPromise;
                const [defaultGenericConfig, defaultSpecificConfigs] = getDefaultFromModelInfo(modelInfo);
                const defaultSpecificConfig = defaultSpecificConfigs[view] || {};

                const builtConfig = mergeSimpleProperties(
                    defaultGenericConfig,
                    customGenericConfig,
                    defaultSpecificConfig,
                    customSpecificConfig,
                );

                mergeDeepProperties(
                    builtConfig,
                    defaultGenericConfig,
                    customGenericConfig,
                    defaultSpecificConfig,
                    customSpecificConfig,
                );

                flattenExpansionDetails(
                    builtConfig,
                    defaultGenericConfig,
                    customGenericConfig,
                    defaultSpecificConfig,
                    customSpecificConfig,
                );

                this.builtConfigs[builtKey] = builtConfig;
                delete this.initialized[builtKey];
                return builtConfig;
            })();
            this.initialized[builtKey].cancel = () => {
                promiseCancel?.();
                delete this.initialized[builtKey];
            };

            return this.initialized[builtKey];
        },
    },
});
