/**
 * @module stores/storeModelConfig
 * @description Pinia store for building, caching, and retrieving merged client-side model configurations from generic and view-specific overrides.
 */
import { trimReactiveObject } from "@arrai-innovations/reactive-helpers";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName, getAppModelViewDotName } from "@vueda/utils/case.js";
import { AuthScopeInvalidatedError } from "@vueda/utils/errors.js";
import { formatSortField } from "@vueda/utils/sortedFields.js";
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
 * @property {string|null} detailLinkField - List column to link to each row's available update or read view; null disables row links.
 * @property {string[]} fetchFields - field names to fetch, and to return from create/update saves, by default
 * @property {string[]} submitFields - field paths sent in the create/update request body by default
 * @property {string[]} expand - field names to expand by default
 * @property {string[]} routeActions - actions to configure routes for
 * @property {ActionPermissionConfig} actions - actions to display by default
 * @property {string[]} filterables - filters to display in list view
 * @property {boolean} allowColumnHiding - whether to allow hiding columns in list view
 * @property {boolean} showTotalRecordNum - whether to show total record count in list view
 * @property {string[]} sortables - field names that can be sorted in list view
 * @property {string[]} sorted - the default sort order for list view
 * @property {string[]} totalables - column names that can carry a total in list view. A list request asks for the ones that are currently visible; totals are opt-in server-side, so asking for none costs no aggregation query. Requested under `COLUMN_TOTALS_PARAM` from `@vueda/utils/constants.js`.
 * @property {{[fieldName: string]: import('@vueda/stores/storeModelInfo.js').FieldInfo}} fieldDetails - each available field details, by field name
 * @property {{[expandName: string]: import('@vueda/stores/storeModelInfo.js').ExpandInfo}} expandDetails - each available expand details, by expand name
 * @property {{[actionName: string]: import('@vueda/stores/storeModelInfo.js').ActionInfo}} actionDetails - each available action details, by action name
 * @property {{[filterName: string]: import('@vueda/stores/storeModelInfo.js').FilterInfo}} filterableDetails - each available filter details, by filter name
 * @property {object} formProps - extra props to pass the form model
 * @property {{[fieldComponentName:string]: import('@vueda/utils/formLookups.js').FieldComponent}} fieldComponents - overriding components for individual fields
 * @property {object} fieldProps - extra props to pass a field component in a form model
 * @property {{[widgetComponentName:string]: import('@vueda/utils/formLookups.js').WidgetComponent}} widgetComponents - overriding components for individual widgets
 * @property {object} widgetProps - extra props to pass a widget component in a form model
 * @property {{[fieldName:string]: import('@vueda/utils/columnLookups.js').ColumnComponent | string}} columnComponents - overriding list column adapter for individual fields, by field name (a component, `() => component`, or a string key into `availableColumns`)
 * @property {{[fieldName:string]: object}} columnProps - extra props to pass a field's list column adapter, by field name
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
 * @property {string|null} [detailLinkField] - List column to link to each row's available update or read view. Built-in text/display adapters support automatic links; custom adapters and slots retain control of navigation.
 * @property {string[]} [fetchFields] - field names to fetch, and to return from create/update saves, by default
 * @property {string[]} [submitFields] - field paths sent in the create/update request body by default
 * @property {string[]} [expand] - field names to expand by default
 * @property {string[]} [routeActions] - actions to configure routes for
 * @property {ActionPermissionConfig} [actions] - actions to display by default
 * @property {string[]} [filterables] - filters to display in list view
 * @property {string[]} [sortables] - field names that can be sorted in list view
 * @property {string[]} [sorted] - the default sort order for list view
 * @property {string[]} [totalables] - column names that can carry a total in list view
 * @property {{[fieldName: string]: import('@vueda/stores/storeModelInfo.js').FieldInfo}} [fieldDetails] - each available field details, by field name
 * @property {{[expandName: string]: import('@vueda/stores/storeModelInfo.js').ExpandInfo}} [expandDetails] - each available expand details, by expand name
 * @property {{[actionName: string]: import('@vueda/stores/storeModelInfo.js').ActionInfo}} [actionDetails] - each available action details, by action name
 * @property {{[filterName: string]: import('@vueda/stores/storeModelInfo.js').FilterInfo}} [filterableDetails] - each available filter details, by filter name
 * @property {object} [formProps] - extra props to pass the form model
 * @property {boolean} allowColumnHiding - whether to allow hiding columns in list view
 * @property {boolean} showTotalRecordNum - whether to show total record count in list view
 * @property {{[fieldComponentName:string]: import('@vueda/utils/formLookups.js').FieldComponent}} [fieldComponents] - overriding components for individual fields
 * @property {object} [fieldProps] - extra props to pass a field component in a form model
 * @property {{[widgetComponentName:string]: import('@vueda/utils/formLookups.js').WidgetComponent}} [widgetComponents] - overriding components for individual widgets
 * @property {object} [widgetProps] - extra props to pass a widget component in a form model
 * @property {{[fieldName:string]: import('@vueda/utils/columnLookups.js').ColumnComponent | string}} [columnComponents] - overriding list column adapter for individual fields, by field name (a component, `() => component`, or a string key into `availableColumns`)
 * @property {{[fieldName:string]: object}} [columnProps] - extra props to pass a field's list column adapter, by field name
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
                columnComponents: {},
                columnProps: {},
                actionDetails: {},
                fieldDetails: {},
                filterableDetails: {},
                sortableDetails: {},
                totalables: [],
            },
            {},
        ];
    }
    const pkField = modelInfo.pk;
    const fields = Object.keys(modelInfo.fields).filter((f) => f !== pkField && !modelInfo.fields[f]?.hidden);
    // The server ignores read-only input, and a create form has no value to show for one yet.
    const writableFields = fields.filter((f) => !modelInfo.fields[f]?.readOnly);
    // The server flags fields that do not help tell one row from another (audit timestamps, a
    // workflow state's machine code, per-record transitions) with `listDefault: false`.
    const listFields = fields.filter((f) => modelInfo.fields[f]?.listDefault !== false);
    const expandFields = modelInfo.expand.map((e) => e.name);
    const actionDetailsByName = Object.fromEntries(modelInfo.actions.map((a) => [a.name, a]));
    const expandDetailsByName = Object.fromEntries(modelInfo.expand.map((e) => [e.name, e]));
    const actionNames = modelInfo.actions.map((a) => a.name);
    const canUpdate = actionNames.includes("update");
    const canRetrieve = actionNames.includes("retrieve");
    const canList = actionNames.includes("list");
    const orderingFields = modelInfo.ordering?.fields || [];
    const orderingFieldsByName = Object.fromEntries(orderingFields.map((o) => [o.name, o]));
    // The server always sends a boolean `ascending` for every field named in `default`
    // (it's the only place that flag is meaningful). A missing one is a server contract
    // bug; log it and assume ascending rather than failing the whole config build over it.
    const defaultSorted = (modelInfo.ordering?.default || []).map((name) => {
        const field = orderingFieldsByName[name];
        if (typeof field?.ascending !== "boolean") {
            console.error(
                `storeModelConfig.getDefaultFromModelInfo: default sort "${name}" has no matching ` +
                    `ordering.fields entry with a boolean "ascending" flag; assuming ascending`,
            );
            return formatSortField(name, false);
        }
        return formatSortField(name, field.ascending === false);
    });
    return [
        {
            verboseName: modelInfo.verboseName,
            verboseNamePlural: modelInfo.verboseNamePlural,
            displayFields: fields,
            detailLinkField: null,
            fetchFields: fields,
            submitFields: writableFields,
            expand: expandFields,
            routeActions: modelInfo.actions.map((a) => a.name),
            actions: modelInfo.actions.map((a) => a.name),
            filterables: Object.keys(modelInfo.filtering || {}),
            sortables: orderingFields.map((o) => o.name),
            sorted: defaultSorted,
            // The totals this model can carry, as the server reports them. An older server sends no
            // `model_column_totals` section at all, which reads the same way as a model with no
            // totals: nothing to offer, so nothing is asked for. The parameter that asks is
            // `COLUMN_TOTALS_PARAM`, a client constant, and is not discovered here.
            totalables: [...(modelInfo.columnTotals?.fields || [])],
            fieldDetails: cloneDeep(modelInfo.fields),
            expandDetails: cloneDeep(expandDetailsByName),
            actionDetails: cloneDeep(actionDetailsByName),
            filterableDetails: cloneDeep(modelInfo.filtering || {}),
            sortablesDetails: cloneDeep(orderingFields),
            formProps: {},
            allowColumnHiding: false,
            showTotalRecordNum: true,
            fieldComponents: {},
            fieldProps: {},
            widgetComponents: {},
            widgetProps: {},
            columnComponents: {},
            columnProps: {},
            actionRedirects: {
                default: canUpdate ? "update" : canRetrieve ? "read" : canList ? "list" : null,
            },
        },
        {
            // Field lists here are fallbacks only: `mergeSimpleProperties` uses them when no custom
            // config names the list or the `fields` shorthand, so they never override an integrator.
            create: { displayFields: writableFields },
            list: { displayFields: listFields },
        },
    ];
};

/**
 * Views whose `fetchFields` default to their resolved `displayFields`, so a list requests only the
 * columns it renders, including columns an integrator named without naming `fetchFields`.
 */
const fetchFollowsDisplayViews = ["list"];

const shallowObjectProperties = [
    "formProps",
    "fieldComponents",
    "widgetComponents",
    "columnComponents",
    "actionRedirects",
];
const deepObjectProperties = [
    "fieldDetails",
    "actionDetails",
    "filterableDetails",
    "sortableDetails",
    "fieldProps",
    "widgetProps",
    "columnProps",
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
 * @param {object} [options] - Merge options.
 * @param {boolean} [options.fetchFollowsDisplay] - Default an unset `fetchFields` to the resolved `displayFields`.
 * @returns {ModelConfig} The merged configuration for simple properties.
 */
const mergeSimpleProperties = (
    defaultGenericConfig,
    customGenericConfig,
    defaultSpecificConfig,
    customSpecificConfig,
    { fetchFollowsDisplay = false } = {},
) => {
    const configs = [customGenericConfig, defaultSpecificConfig, customSpecificConfig];
    const fieldKeys = ["displayFields", "fetchFields", "submitFields"];
    const mergedConfig = omit(defaultGenericConfig, [...nonSimpleProperties, ...fieldKeys]);
    for (const config of configs) {
        for (const [key, value] of Object.entries(config)) {
            // A default view-specific field list is a fallback, applied below: merged in here, it
            // would override a field list the integrator set in the model-wide config.
            if (!nonSimpleProperties.includes(key) && !(config === defaultSpecificConfig && fieldKeys.includes(key))) {
                mergedConfig[key] = value;
            }
        }
    }

    const expandNames = new Set(mergedConfig.expand || []);
    for (const fieldKey of fieldKeys) {
        // use fields if displayFields, fetchFields, and submitFields are not set
        if (!mergedConfig[fieldKey] || mergedConfig[fieldKey].length === 0) {
            if (mergedConfig.fields) {
                // A field named by the shorthand can be display- and fetch-valid while being
                // unsubmittable (an expand-flattened field, addressed by a dotted name whose prefix
                // is an expand): dropped here rather than in `submitFields` itself, so a shorthand
                // that's correct for `list`/`read` doesn't fail those views for a `create`/`update`
                // restriction they never apply to. An explicitly declared `submitFields` entry still
                // hits `validateSubmitFields` below.
                mergedConfig[fieldKey] =
                    fieldKey === "submitFields"
                        ? mergedConfig.fields.filter((fieldName) => {
                              const dotIndex = fieldName.indexOf(".");
                              return dotIndex === -1 || !expandNames.has(fieldName.slice(0, dotIndex));
                          })
                        : mergedConfig.fields;
            } else if (fieldKey === "fetchFields" && fetchFollowsDisplay) {
                mergedConfig[fieldKey] = mergedConfig.displayFields;
            } else if (defaultSpecificConfig[fieldKey]) {
                mergedConfig[fieldKey] = defaultSpecificConfig[fieldKey];
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
 * Reject a declared `submitFields` entry that names an expand-flattened display field.
 *
 * Only a declared entry reaches this: `mergeSimpleProperties` already drops a flattened field when
 * it derives `submitFields` from the `fields` shorthand, so a shorthand that is correct for display
 * and fetch still builds a `list` or `read` config.
 *
 * `flattenExpansionDetails` only ever produces a dotted `expandName.subFieldName` entry for
 * display and fetch purposes: it flattens whatever DRF-flex-fields expands for reading, and VUEDA
 * has no mechanism to submit a nested value back through it. Writable nested data goes through a
 * writable inline/array field instead, addressed by the expand's own plain name — never by one of
 * its flattened dotted children — so a dotted `submitFields` entry whose prefix names an expanded
 * field is always a misconfiguration rather than a legitimate way to submit a nested value.
 *
 * @param {ModelConfig} builtConfig - The built configuration, read for `expand` and `submitFields`.
 * @param {{app: string, model: string}} args - Identifies the model being configured, for the error message.
 * @throws {Error} If `submitFields` names an expand-flattened display field.
 */
const validateSubmitFields = (builtConfig, args) => {
    const expandNames = new Set(builtConfig.expand || []);
    if (!expandNames.size) {
        return;
    }

    const invalidFields = (builtConfig.submitFields || []).filter((fieldName) => {
        const dotIndex = fieldName.indexOf(".");
        return dotIndex !== -1 && expandNames.has(fieldName.slice(0, dotIndex));
    });

    if (invalidFields.length) {
        throw new Error(
            `submitFields for ${args.app}.${args.model} names expand-flattened display field(s): ` +
                `${invalidFields.join(", ")}. VUEDA does not support submitting a nested value through a ` +
                "flattened display field. Remove them from submitFields, " +
                "and use a writable inline/array field for anything the form must submit.",
        );
    }
};

/**
 * Merge and flatten expansion details into fieldDetails using dotted keys.
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
 *       "expandName.subFieldName" — the same dotted form the server reports for `f`/`e`/`o` and
 *       filters, so a field an integrator overrides through `fieldComponents`/`sortables`/etc.
 *       matches the name the server and the URL both use. The default configuration for this
 *       sub-field comes from the merged expandDetails.f, and any custom overrides provided via
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
            const expandedFieldName = `${expandName}.${fieldName}`;
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
        /**
         * Incremented by `clearAuthScoped`. Builds capture it before awaiting and discard their
         * result if it changed while the build was in flight.
         *
         * @type {number}
         */
        authScopeGeneration: 0,
    }),
    actions: {
        /**
         * Drops the built configs, because they are derived from permission-filtered model info.
         *
         * `genericConfigs` and `specificConfigs` are integrator input, not server data, so they
         * survive. In-flight builds are cancelled first, the same way `setConfig` cancels the builds
         * its overrides invalidate; this is that cancellation generalized from one model to all of
         * them.
         *
         * Keys are deleted in place so `toRef` handles consumers hold into `builtConfigs` keep
         * reading the live container. Never replace a container here (that is what `$reset` does,
         * and it detaches every held handle).
         *
         * @returns {void}
         */
        clearAuthScoped() {
            this.authScopeGeneration += 1;
            for (const key of Object.keys(this.initialized)) {
                this.initialized[key]?.cancel?.();
            }
            trimReactiveObject(this.initialized, {});
            trimReactiveObject(this.builtConfigs, {});
        },
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
            const generation = this.authScopeGeneration;
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
                if (this.authScopeGeneration !== generation) {
                    // the authenticated user changed while this build was in flight: the model info it
                    // is built from was filtered for the previous principal, so nothing is cached and
                    // the caller is rejected rather than handed a config built for someone else.
                    throw new AuthScopeInvalidatedError("storeModelConfig.getConfig", builtKey);
                }
                const [defaultGenericConfig, defaultSpecificConfigs] = getDefaultFromModelInfo(modelInfo);
                const defaultSpecificConfig = defaultSpecificConfigs[view] || {};

                const builtConfig = mergeSimpleProperties(
                    defaultGenericConfig,
                    customGenericConfig,
                    defaultSpecificConfig,
                    customSpecificConfig,
                    { fetchFollowsDisplay: fetchFollowsDisplayViews.includes(view) },
                );
                validateSubmitFields(builtConfig, args);

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
