/**
 * @module use/useFormModel
 * @description Builds and provides a reactive form model state by combining server model info, client model config, and field/widget component mappings.
 */
import { deepUnref } from "@arrai-innovations/reactive-helpers";
import { buildForm } from "@vueda/utils/buildForm.js";
import { choiceFieldMappings, defaultFieldMappings, manyFieldMappings } from "@vueda/utils/fieldMappings.js";
import { availableFields, availableWidgets } from "@vueda/utils/formLookups.js";
import { getTypeMapping } from "@vueda/utils/getTypeMapping.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import { provide, reactive, readonly, shallowReactive, toRef, watch } from "vue";

/**
 * Get the field component for a given Django field type.
 *
 * All regular fields resolve to FormField. FieldSet* structural components
 * (expanded serializers, tabular inlines) are resolved separately by
 * buildForm's baseExpanded branch or custom fieldComponents overrides.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} _field - Object that contains detail of a field (unused after per-type dispatch removal).
 * @returns {import('@vueda/utils/filterLookups.js').FieldComponent} The field component.
 */
const getFieldComponent = (_field) => {
    return availableFields.FormField;
};
/**
 * Get the default widget for a given field object.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - Object that contains detail of a field
 * @returns {import('@vueda/utils/filterLookups.js').WidgetComponent} The widget component.
 */
const getWidgetComponent = (field) => {
    if (field.readOnly) {
        return getTypeMapping(defaultFieldMappings, field)?.readOnlyWidget ?? availableWidgets.WidgetReadOnly;
    }
    const defaultMapping = getTypeMapping(defaultFieldMappings, field);
    let widget;
    if (field.choices) {
        const fieldObject = getTypeMapping(choiceFieldMappings, field);
        widget = field.many ? fieldObject?.manyWidget : fieldObject?.widget;
    } else if (field.many) {
        widget = getTypeMapping(manyFieldMappings, field)?.widget;
    }
    return widget ?? defaultMapping?.widget;
};

/**
 * Get the default widget props for a given field object.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - Object that contains detail of a field
 * @returns {{[fieldName:string]: {[key:string]: any}}|undefined} widgetProps - The default widget props
 */
const getWidgetProps = (field) => {
    const defaultMapping = getTypeMapping(defaultFieldMappings, field);
    if (field.readOnly && defaultMapping?.readOnlyWidget) {
        return { ...defaultMapping.readOnlyWidgetProps };
    }
    let baseProps;
    if (field.typeModel === "GeneratedField" && field.typeSerializer === "ModelField") {
        baseProps = defaultMapping?.[field.typeDb]?.widgetProps;
    }
    if (field.choices) {
        baseProps = field.many ? choiceFieldMappings[field.typeSerializer]?.[field.typeModel]?.manyWidgetProps : {};
    } else if (field.many) {
        baseProps = manyFieldMappings[field.typeSerializer]?.[field.typeModel]?.widgetProps;
    }
    return { ...defaultMapping?.widgetProps, ...(baseProps ?? {}) };
};

/**
 * Get the default field props for a given field object.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - Object that contains detail of a field
 * @returns {{[fieldName:string]: {[key:string]: any}}|undefined} fieldProps - The default field props
 */
const getFieldProps = (field) => {
    const defaultMapping = getTypeMapping(defaultFieldMappings, field);
    let baseProps;
    if (field.typeModel === "GeneratedField" && field.typeSerializer === "ModelField") {
        baseProps = defaultMapping?.[field.typeDb]?.fieldProps;
    }
    if (field.many && !field.choices) {
        baseProps = manyFieldMappings[field.typeSerializer]?.[field.typeModel]?.fieldProps;
    }
    return { ...defaultMapping?.fieldProps, ...(baseProps ?? {}) };
};
/**
 * @typedef {object} UseFormModelRawState
 * @property {string} app - The app name to load form configuration for
 * @property {string} model - The model name to load form configuration for
 * @property {string|undefined} view - The view name if wanting to use view specific configuration.
 * @property {string[]} fields - The fields to display, either passed in or from config.
 * @property {string[]} expand - The fields to expand, either passed in or from config.
 * @property {{[fieldName:string]:import('@vueda/stores/storeModelInfo.js').FieldInfo}} fieldDetails - The merged fieldDetails, either passed in, from config or from server info.
 * @property {{[fieldName:string]:import('@vueda/stores/storeModelInfo.js').ExpandInfo}} expandDetails - The merged expandDetails, either passed in, from config or from server info.
 * @property {{[fieldName:string]:import('vue').Component}} fieldComponents - The field components to use, either passed in or as a result of fieldObject or expandObject.
 * @property {{[fieldName:string]: import('vue').Component}} widgetComponents - The widget components to use, either passed in or as a result of fieldObject or expandObject.
 * @property {Set<string>} baseFieldNames - The field names that are not expanded.
 * @property {Set<string>} expansionFieldNames - The field names that are expanded.
 * @property {Set<string>} expandedFieldNames - The field names that are expanded and base.
 */

/**
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<UseFormModelRawState>>} UseFormModelState
 */

/**
 * @typedef {object} UseFormModelRawOverridableProps
 * @property {string[]|undefined} fields - The fields to display, if different from the default
 * @property {string[]|undefined} expand - The fields to expand, if different from the default
 * @property {{[fieldName:string]: [componentName:string, ()=>Promise<import('vue').Component>]}|undefined} fieldComponents - The field components to use, if different from the default, by field path
 * @property {{[fieldName:string]: {[key:string]: any}}|undefined} fieldProps - The field props to use, if different from the default, by field path
 * @property {{[fieldName:string]: ()=>Promise<import('vue').Component>}|undefined} widgetComponents - The widget components to use, if different from the default, by field path
 * @property {{[fieldName:string]: {[key:string]: any}}|undefined} widgetProps - The widget props to use, if different from the default, by field path
 */

/**
 * @typedef {UseFormModelRawOverridableProps} UseFormModelRawProps
 * @property {string} app - The app name to load form configuration for
 * @property {string} model - The model name to load form configuration for
 * @property {string|undefined} view - The view name if wanting to use view specific configuration.
 * @property {{[fieldName:string]:import('@vueda/stores/storeModelInfo.js').FieldInfo}|undefiend} fieldDetails - The field details to use, if different from the default
 * @property {{[fieldName:string]:import('@vueda/stores/storeModelInfo.js').ExpandInfo}|undefined} expandDetails - The expand details to use, if different from the default
 */

/**
 * Using server model info and client model config, this hook provides the necessary reactive state for a form model.
 *
 * @param {import('vue').Reactive<UseFormModelRawProps>} props - The reactive arguments.
 * @returns {UseFormModelState} The reactive state.
 */
export function useFormModel(props) {
    const state = reactive(
        /** @type {UseFormModelRawState} */ {
            app: toRef(props, "app"),
            model: toRef(props, "model"),
            view: toRef(props, "view"),
            fields: [],
            computedFields: [],
            expand: [],
            fieldDetails: {},
            expandDetails: {},
            fieldComponents: shallowReactive({}),
            fieldProps: {},
            widgetComponents: shallowReactive({}),
            widgetProps: {},
            baseFieldNames: [],
            expansionFieldNames: [],
            expandedFieldNames: [],
        },
    );
    const {
        setUpWatch,
        assignStateObjectsIfChanged,
        setFieldComponent,
        setFieldComponentProps,
        setWidgetComponent,
        setWidgetComponentProps,
    } = buildForm(props, state, getFieldComponent, getFieldProps, getWidgetComponent, getWidgetProps);
    setUpWatch("displayFields", "fieldDetails", "fields", "fieldDetails");
    setUpWatch("expand", "expandDetails");
    setUpWatch("computedFields");

    watch(
        [toRef(state, "expand"), toRef(state, "fields"), toRef(state, "fieldDetails"), toRef(state, "expandDetails")],
        ([expand, fields, fieldDetails, expandDetails]) => {
            if (fields.length) {
                const fieldComponents = {};
                const fieldProps = {};
                const widgetComponents = {};
                const widgetProps = {};
                const allFields = [];
                const unrefExpand = deepUnref(expand) || [];
                const baseFieldNames = new Set();
                const expansionFieldNames = new Set();
                const expandedFieldNames = new Set();
                let anySpecifiedExpand = false;
                for (const fieldName of deepUnref(fields) || []) {
                    const item = {
                        fieldName,
                        fieldDetail: fieldDetails[fieldName],
                        isExpandedField: fieldName.includes("__"),
                        baseExpanded: unrefExpand.includes(fieldName),
                        expandName: null,
                    };
                    if (item.isExpandedField) {
                        anySpecifiedExpand = true;
                        // we don't deal with nested expand. we might need to in the future
                        [item.expandName, item.expandFieldName] = fieldName.split("__", 2);
                        item.expandDetail = expandDetails[item.expandName];
                        if (!item.expandDetail) {
                            throw new Error(
                                `Unknown expand ${item.expandName} specified for ${props.app}.${props.model}`,
                            );
                        }
                        item.fieldDetail = item.expandDetail.f[item.expandFieldName];
                        if (!item.fieldDetail) {
                            if (item.expandFieldName.endsWith("_")) {
                                item.fieldDetail = {
                                    name: item.expandFieldName,
                                    label: "",
                                    typeDb: "",
                                    typeModel: "",
                                    typeSerializer: "",
                                    many: false,
                                    readOnly: true,
                                    required: false,
                                };
                            } else {
                                throw new Error(
                                    `Unknown field ${item.expandFieldName} specified for expand ${item.expandName} on ${props.app}.${props.model}`,
                                );
                            }
                        }
                    }
                    if (item.baseExpanded) {
                        item.expandDetail = expandDetails[fieldName];
                    }
                    if (!item.fieldDetail) {
                        if (item.fieldName.endsWith("_")) {
                            item.fieldDetail = {
                                name: item.fieldName,
                                label: "",
                                typeDb: "",
                                typeModel: "",
                                typeSerializer: "",
                                many: false,
                                readOnly: true,
                                required: false,
                            };
                        } else {
                            throw new Error(`Unknown field ${fieldName} specified for ${props.app}.${props.model}`);
                        }
                    }
                    allFields.push(item);
                }
                if (!anySpecifiedExpand && unrefExpand.length) {
                    // if you didn't ask for any expand fields manually, but you did specify an expand,
                    //  add all expansion fields
                    for (const expandName of unrefExpand) {
                        const baseIndex = allFields.findIndex((item) => item.fieldName === expandName);
                        if (baseIndex === -1) {
                            continue;
                        }
                        const baseItem = allFields[baseIndex];
                        for (const [expandFieldName, expandFieldDetail] of Object.entries(
                            baseItem.expandDetail.f || {},
                        )) {
                            const fieldName = `${expandName}__${expandFieldName}`;
                            const item = {
                                fieldName,
                                fieldDetail: expandFieldDetail,
                                isExpandedField: true,
                                expandName,
                                expandFieldName,
                                expandDetail: baseItem.expandDetail,
                            };
                            allFields.splice(baseIndex + 1, 0, item);
                        }
                    }
                }
                for (const field of allFields) {
                    const { fieldName, fieldDetail, baseExpanded, isExpandedField } = field;
                    if (fieldDetail.action === true) {
                        continue;
                    }
                    if (!isExpandedField) {
                        baseFieldNames.add(fieldName);
                    } else {
                        expansionFieldNames.add(fieldName);
                    }
                    if (baseExpanded) {
                        expandedFieldNames.add(fieldName);
                    }
                    fieldComponents[fieldName] = setFieldComponent(fieldName, fieldDetail, baseExpanded);
                    fieldProps[fieldName] = setFieldComponentProps(fieldName, fieldDetail);
                    widgetComponents[fieldName] = setWidgetComponent(fieldName, fieldDetail, baseExpanded);
                    widgetProps[fieldName] = setWidgetComponentProps(fieldName, fieldDetail, isExpandedField, field);
                }
                assignStateObjectsIfChanged({
                    fieldComponents,
                    fieldProps,
                    widgetComponents,
                    widgetProps,
                    baseFieldNames,
                    expansionFieldNames,
                    expandedFieldNames,
                });
            } else {
                assignStateObjectsIfChanged({
                    fieldComponents: {},
                    fieldProps: {},
                    widgetComponents: {},
                    widgetProps: {},
                    baseFieldNames: new Set(),
                    expansionFieldNames: new Set(),
                    expandedFieldNames: new Set(),
                });
            }
        },
        { deep: true, immediate: true },
    );
    const returnObject = readonly(state);
    provide(FormModelSymbol, returnObject);
    return returnObject;
}
