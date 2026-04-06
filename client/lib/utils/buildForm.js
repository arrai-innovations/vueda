/**
 * @module utils/buildForm
 * @description Builds and manages reactive form state, resolving field and widget components from configuration and props.
 */
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { deepUnref } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { mergeTheme } from "@vueda/use/useTheme.js";
import { availableFields, availableWidgets } from "@vueda/utils/formLookups.js";
import isEmpty from "lodash-es/isEmpty.js";
import isEqual from "lodash-es/isEqual.js";
import isObject from "lodash-es/isObject.js";
import isSet from "lodash-es/isSet.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, toRef, watch } from "vue";

/**
 * Returns the slot names for a field's help, error, and message slots.
 *
 * @param {string} formModelName - The name of the field's configuration in FormModel configuration.
 * @returns {string[]} The slot names for the field's help, error, and message slots.
 */
export const getFormChoresSlotNames = (formModelName) => {
    return [
        "field-help",
        "field-error",
        "field-message",
        `field(${formModelName})help`,
        `field(${formModelName})error`,
        `field(${formModelName})message`,
    ];
};

/**
 * @typedef {object} StateRaw
 * @property {string[]} fields - The list of field names.
 * @property {({
 *     [fieldName: string]: import('@vueda/stores/storeModelInfo.js').FieldInfo
 * })} fieldDetails - Details of each field by name.
 */

/**
 * @typedef {object} PropsRaw
 * @property {string} app - The app label.
 * @property {string} model - The model name.
 * @property {string} view - The view name.
 */

/**
 * Functions for managing form configuration and updating reactive state.
 *
 * @typedef {object} BuildForm
 * @property {((
 *     configKey: string,
 *     configDetailKey?: string,
 *     propKey?: string,
 *     propDetailKey?: string,
 *     stateKey?: string,
 *     stateDetailKey?: string
 * ) => void)} setUpWatch - Set up a watch for a configuration key.
 * @property {(args: {
 *     [key: string]: any
 * }) => void} assignStateObjectsIfChanged - Assign state objects if they have changed.
 * @property {(
 *    (key: string, detailObject: import('@vueda/stores/storeModelInfo.js').FieldInfo, baseExpanded?: boolean, fieldName?: string) =>
 *        import('vue').ComputedRef<import('vue').Component>
 * )} setFieldComponent - Set the component for a field.
 * @property {(
 *     key: string,
 *     detailObject: import('@vueda/stores/storeModelInfo.js').FieldInfo,
 *     fieldName?: string
 * ) => import('vue').ComputedRef<object>} setFieldComponentProps - Set the component props for a field.
 * @property {(
 *     key: string,
 *     detailObject: import('@vueda/stores/storeModelInfo.js').FieldInfo,
 *     baseExpanded?: boolean,
 *     fieldName?: string
 * ) => import('vue').ComputedRef<import('vue').Component>} setWidgetComponent - Set the widget for a field.
 * @property {(
 *     key: string,
 *     detailObject: import('@vueda/stores/storeModelInfo.js').FieldInfo,
 *     isExpandedField?: boolean,
 *     field?: object,
 *     fieldName?: string
 * ) => import('vue').ComputedRef<object>} setWidgetComponentProps - Set the widget props for a field.
 */

/**
 * Builds the form configuration by setting up state management for fields, components, and widgets.
 *
 * @param {import('vue').UnwrapNestedRefs<PropsRaw>} props - The reactive props object containing form metadata.
 * @param {import('vue').UnwrapNestedRefs<StateRaw>} state - The target reactive object to manage for form state.
 * @param {(field: import('@vueda/stores/storeModelInfo.js').FieldInfo) => import('vue').Component} getFieldComponent - Function to retrieve the component for a given field.
 * @param {(field: import('@vueda/stores/storeModelInfo.js').FieldInfo) => object} getFieldProps - Function to retrieve field-specific properties.
 * @param {(field: import('@vueda/stores/storeModelInfo.js').FieldInfo) => import('vue').Component} getWidgetComponent - Function to retrieve the widget for a given field.
 * @param {(field: import('@vueda/stores/storeModelInfo.js').FieldInfo) => object} getWidgetProps - Function to retrieve widget-specific properties.
 * @returns {BuildForm} Functions for managing form configuration and updating reactive state.
 */
export function buildForm(props, state, getFieldComponent, getFieldProps, getWidgetComponent, getWidgetProps) {
    const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), toRef(props, "view"));
    const es = effectScope();

    const assignStateObjectsIfChanged = (args) => {
        for (const key in args) {
            if (!isEqual(state[key], args[key])) {
                if (isSet(args[key])) {
                    state[key] = new Set(args[key]);
                } else {
                    assignReactiveObject(state[key], args[key]);
                }
            }
        }
    };

    function setUpWatch(
        configKey,
        configDetailKey = undefined,
        propKey = configKey,
        propDetailKey = configDetailKey,
        stateKey = propKey,
        stateDetailKey = propDetailKey,
    ) {
        watch(
            [
                () => modelConfig.config[configKey],
                () => (configDetailKey ? modelConfig.config[configDetailKey] : undefined),
                toRef(props, propKey),
                toRef(props, propDetailKey),
            ],
            () => {
                if (configDetailKey && !Object.keys(modelConfig.config?.[configDetailKey] || {}).length) {
                    return;
                }
                // props has priority over config
                const desired = props[propKey] || modelConfig.config?.[configKey] || [];
                // details fields merge at the field property level
                const desiredDetails = {};
                if (configDetailKey) {
                    for (const d of desired) {
                        if (modelConfig.config?.[configDetailKey]?.[d] || props[propDetailKey]?.[d]) {
                            desiredDetails[d] = {
                                ...modelConfig.config?.[configDetailKey]?.[d],
                                ...props[propDetailKey]?.[d],
                            };
                        }
                    }
                    assignStateObjectsIfChanged({
                        [stateKey]: desired,
                        [stateDetailKey]: desiredDetails,
                    });
                } else {
                    assignStateObjectsIfChanged({
                        [stateKey]: desired,
                    });
                }
            },
            { immediate: true, deep: true },
        );
    }

    function setFieldComponent(key, detailObject, baseExpanded = false, fieldName = key) {
        let component;
        es.run(() => {
            component = computed(() => {
                if ((deepUnref(state.computedFields) || []).includes(fieldName)) {
                    return availableFields.FormField;
                }
                const customField =
                    props.fieldComponents?.[fieldName] ||
                    modelConfig?.config?.fieldComponents?.[fieldName] ||
                    (baseExpanded
                        ? detailObject.many
                            ? availableFields.FieldSetStackedInline
                            : availableFields.FieldSetSingularStackedInline
                        : getFieldComponent(detailObject));
                if (typeof customField === "function") {
                    // If it's a function, it's a component reference wrapped in a fn to avoid reactivity issues
                    return customField();
                }
                if (typeof customField === "string") {
                    // let props and modelConfig not pass actual components
                    return availableFields[customField];
                }
                if (!customField) {
                    throw new Error(
                        `No field component found for field "${fieldName}" in app "${props.app}" model "${props.model}"`,
                    );
                }
                return customField;
            });
        });
        return component;
    }

    function setFieldComponentProps(key, detailObject, fieldName = key) {
        let componentProps;
        es.run(() => {
            componentProps = computed(() => {
                const fieldLevelThemeOverride = getFieldLevelThemeOverride(fieldName);
                return {
                    // useFormModel resolves type, the fields don't care about the server type.
                    contextless: (deepUnref(state.computedFields) || []).includes(fieldName),
                    ...omit(detailObject, ["type"]),
                    ...getFieldProps(detailObject),
                    ...(deepUnref(modelConfig.config?.fieldProps?.[fieldName]) || {}),
                    ...(deepUnref(props.fieldProps?.[fieldName]) || {}),
                    themeOverride: fieldLevelThemeOverride,
                    name: key,
                    readOnly: getIsReadOnly(fieldName, detailObject.readOnly),
                };
            });
        });
        return componentProps;
    }

    function getIsReadOnly(fieldName, detailReadOnly = false) {
        const readOnlyProp = props.fieldProps?.[fieldName]?.readOnly;
        const modelConfigReadOnly = modelConfig.config?.fieldProps?.[fieldName]?.readOnly;

        const hasExplicitFalseOverride = readOnlyProp === false || modelConfigReadOnly === false;

        const rv =
            !hasExplicitFalseOverride &&
            (props.view === "read" ||
                (deepUnref(state.computedFields) || []).includes(fieldName) ||
                readOnlyProp === true ||
                modelConfigReadOnly === true ||
                detailReadOnly === true);
        return rv;
    }

    function setWidgetComponent(key, detailObject, baseExpanded = false, fieldName = key) {
        let widget;
        es.run(() => {
            widget = computed(() => {
                if (getIsReadOnly(fieldName, detailObject.readOnly)) {
                    return availableWidgets.WidgetReadOnly;
                }
                if (baseExpanded) {
                    return null;
                }
                const customWidget =
                    props.widgetComponents?.[fieldName] ||
                    modelConfig?.config?.widgetComponents?.[fieldName] ||
                    getWidgetComponent(detailObject);
                if (typeof customWidget === "function") {
                    // If it's a function, it's a component reference wrapped in a fn to avoid reactivity issues
                    return customWidget();
                }
                if (typeof customWidget === "string") {
                    // Allow props and modelConfig to pass component names
                    return availableWidgets[customWidget];
                }
                if (!customWidget) {
                    throw new Error(
                        `No widget component found for field "${fieldName}" in app "${props.app}" model "${props.model}"`,
                    );
                }
                return customWidget;
            });
        });

        return widget;
    }

    function setWidgetComponentProps(key, detailObject, isExpandedField = false, field = {}, fieldName = key) {
        let widget;
        es.run(() => {
            widget = computed(() => {
                const fieldLevelThemeOverride = getFieldLevelThemeOverride(fieldName, true);
                const baseProps = {
                    ...getWidgetProps(detailObject),
                    ...(deepUnref(modelConfig.config?.widgetProps?.[fieldName]) || {}),
                    ...(deepUnref(props.widgetProps?.[fieldName]) || {}),
                };
                if (detailObject.choices === true) {
                    if (isExpandedField) {
                        const { expandDetail, expandFieldName } = field;
                        baseProps.fieldApp = expandDetail.app_label;
                        baseProps.fieldModel = expandDetail.model;
                        baseProps.app = detailObject.appLabel;
                        baseProps.model = detailObject.model;
                        baseProps.fieldName = expandFieldName;
                    } else {
                        baseProps.fieldApp = props.app;
                        baseProps.fieldModel = props.model;
                        baseProps.app = detailObject.appLabel;
                        baseProps.model = detailObject.model;
                        baseProps.fieldName = fieldName;
                    }
                } else {
                    baseProps.options = detailObject.choices;
                }
                baseProps.themeOverride = fieldLevelThemeOverride;
                baseProps.readOnly = getIsReadOnly(fieldName, detailObject.readOnly);
                return baseProps;
            });
        });
        return widget;
    }

    function getFieldLevelThemeOverride(fieldName, widgetOverride = false) {
        const formThemeOverride = deepUnref(props.themeOverride) || {};
        const modelFieldProps = deepUnref(modelConfig.config?.fieldProps?.[fieldName]) || {};
        const propFieldProps = deepUnref(props.fieldProps?.[fieldName]) || {};
        let modelWidgetProps = {};
        if (widgetOverride) {
            modelWidgetProps = deepUnref(modelConfig.config?.widgetProps?.[fieldName]) || {};
        }
        let propWidgetProps = {};
        if (widgetOverride) {
            propWidgetProps = deepUnref(props.widgetProps?.[fieldName]) || {};
        }

        const modelFieldThemeOverride = deepUnref(modelFieldProps.themeOverride) || {};
        const propFieldThemeOverride = deepUnref(propFieldProps.themeOverride) || {};
        let modelWidgetThemeOverride = {};
        if (widgetOverride) {
            modelWidgetThemeOverride = deepUnref(modelWidgetProps.themeOverride) || {};
        }
        let propWidgetThemeOverride = {};
        if (widgetOverride) {
            propWidgetThemeOverride = deepUnref(propWidgetProps.themeOverride) || {};
        }

        const themeOverride = mergeTheme(
            {},
            formThemeOverride,
            modelFieldThemeOverride,
            propFieldThemeOverride,
            modelWidgetThemeOverride,
            propWidgetThemeOverride,
            (objValue, srcValue, _key, _object, _source, stack) => {
                // merge component, slot, and property level, but clobber below that
                if (stack.size < 3) {
                    // use default behavior for this level
                    return undefined;
                }
                if (isObject(objValue) && isObject(srcValue)) {
                    return {
                        ...objValue,
                        ...srcValue,
                    };
                }
                if (Array.isArray(objValue) && Array.isArray(srcValue)) {
                    return [...objValue, ...srcValue];
                }
                return undefined;
            },
        );
        return isEmpty(themeOverride) ? undefined : themeOverride;
    }

    return {
        assignStateObjectsIfChanged,
        setFieldComponent,
        setFieldComponentProps,
        setUpWatch,
        setWidgetComponent,
        setWidgetComponentProps,
    };
}
