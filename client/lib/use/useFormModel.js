import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { availableFields, availableWidgets } from "@vueda/utils/filterLookups.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, provide, reactive, readonly, shallowReactive, toRef, watch } from "vue";
import { deepUnref } from "vue-deepunref";

// todo: we should have a way to register custom field components
const builtInTypes = {
    IntegerRangeField: availableFields.FieldRange,
    DateRangeField: availableFields.FieldRange,
    TextField: availableFields.FieldString,
    CharField: availableFields.FieldString,
    BooleanField: availableFields.FieldBoolean,
    DateField: availableFields.FieldDate,
    DateTimeField: availableFields.FieldDate,
    DecimalField: availableFields.FieldNumber,
    FloatField: availableFields.FieldNumber,
    IntegerField: availableFields.FieldNumber,
    PositiveIntegerField: availableFields.FieldNumber,
    PositiveSmallIntegerField: availableFields.FieldNumber,
    SmallIntegerField: availableFields.FieldNumber,
    TimeField: availableFields.FieldTime,
    EmailField: availableFields.FieldString,
    URLField: availableFields.FieldString,
    UUIDField: availableFields.FieldString,
    ForeignKey: availableFields.FieldString,
    ManyToManyField: availableFields.FieldString,
    OneToOneField: availableFields.FieldString,
    JSONField: availableFields.FieldObject,
    ArrayField: availableFields.FieldArray,
    BinaryField: availableFields.FieldString,
    FilePathField: availableFields.FieldString,
    IPAddressField: availableFields.FieldString,
    GenericIPAddressField: availableFields.FieldString,
    SlugField: availableFields.FieldString,
    FileField: availableFields.FieldString,
    ImageField: availableFields.FieldString,
    AutoField: availableFields.FieldString,
    BigAutoField: availableFields.FieldString,
    BigIntegerField: availableFields.FieldNumber,
    DurationSecondsField: availableFields.FieldString,
    GenericRelation: availableFields.FieldString,
    GenericForeignKey: availableFields.FieldString,
    NullBooleanField: availableFields.FieldBoolean,
    PositiveBigIntegerField: availableFields.FieldNumber,
    PositiveDecimalField: availableFields.FieldNumber,
    ManyRelatedField: availableFields.FieldString,
    PrimaryKeyRelatedField: availableFields.FieldString,
};

// todo: we should have a way to register custom widgets
const defaultWidgets = {
    IntegerRangeField: availableWidgets.WidgetSlider,
    DateRangeField: availableWidgets.WidgetDatePicker,
    TextField: availableWidgets.WidgetTextarea,
    CharField: availableWidgets.WidgetInput,
    BooleanField: availableWidgets.WidgetCheckbox,
    DateField: availableWidgets.WidgetDatePicker,
    DateTimeField: availableWidgets.WidgetDatePicker,
    DecimalField: availableWidgets.WidgetInput,
    FloatField: availableWidgets.WidgetInput,
    IntegerField: availableWidgets.WidgetInput,
    PositiveIntegerField: availableWidgets.WidgetInput,
    PositiveSmallIntegerField: availableWidgets.WidgetInput,
    SmallIntegerField: availableWidgets.WidgetInput,
    TimeField: availableWidgets.WidgetInput,
    EmailField: availableWidgets.WidgetInput,
    URLField: availableWidgets.WidgetInput,
    UUIDField: availableWidgets.WidgetInput,
    ForeignKey: availableWidgets.WidgetModel,
    ManyToManyField: availableWidgets.WidgetModel,
    OneToOneField: availableWidgets.WidgetModel,
    JSONField: availableWidgets.WidgetTextarea,
    ArrayField: availableWidgets.WidgetTextarea,
    BinaryField: availableWidgets.WidgetInput,
    FilePathField: availableWidgets.WidgetInput,
    IPAddressField: availableWidgets.WidgetInput,
    GenericIPAddressField: availableWidgets.WidgetInput,
    SlugField: availableWidgets.WidgetInput,
    FileField: availableWidgets.WidgetInput,
    ImageField: availableWidgets.WidgetInput,
    AutoField: availableWidgets.WidgetInput,
    BigAutoField: availableWidgets.WidgetInput,
    BigIntegerField: availableWidgets.WidgetInput,
    DurationSecondsField: availableWidgets.WidgetInput,
    GenericRelation: availableWidgets.WidgetModel,
    GenericForeignKey: availableWidgets.WidgetModel,
    NullBooleanField: availableWidgets.WidgetCheckbox,
    PositiveBigIntegerField: availableWidgets.WidgetInput,
    PositiveDecimalField: availableWidgets.WidgetInput,
    ManyRelatedField: availableWidgets.WidgetModel,
    PrimaryKeyRelatedField: availableWidgets.WidgetModel,
};

const defaultFieldsProps = {};

// todo: we should have a way to register custom widget props for custom fields
// modelconfig should have a view that client can pass in custom props
const defaultWidgetProps = {
    IntegerRangeField: { selectionMode: "range" },
    DateRangeField: { selectionMode: "range" },
    TextField: {},
    CharField: {},
    BooleanField: {},
    DateField: { type: "date" },
    DateTimeField: { type: "datetime-local" },
    DecimalField: { type: "number" },
    FloatField: { type: "number" },
    IntegerField: { type: "number" },
    PositiveIntegerField: { type: "number" },
    PositiveSmallIntegerField: { type: "number" },
    SmallIntegerField: { type: "number" },
    TimeField: { type: "time" },
    EmailField: {},
    URLField: {},
    UUIDField: {},
    ForeignKey: { type: "select" },
    ManyToManyField: { type: "multiSelect" },
    OneToOneField: { type: "select" },
    JSONField: {},
    ArrayField: {},
    BinaryField: {},
    FilePathField: {},
    IPAddressField: {},
    GenericIPAddressField: {},
    SlugField: {},
    FileField: {},
    ImageField: {},
    AutoField: {},
    BigAutoField: {},
    BigIntegerField: { type: "number" },
    DurationSecondsField: {},
    GenericRelation: { type: "select" },
    GenericForeignKey: { type: "select" },
    NullBooleanField: {},
    PositiveBigIntegerField: { type: "number" },
    PositiveDecimalField: { type: "number" },
    ManyRelatedField: { type: "multiSelect" },
    PrimaryKeyRelatedField: { type: "select" },
};

/**
 * Get the field component for a given Django field type.
 *
 * @param {boolean} many - True if the field is many.
 * @param {string} type - The Django field type.
 * @returns {import('@vueda/utils/filterLookups.js').FieldComponent} The field component.
 */
const djangoTypeToFieldComponent = (many, type) => {
    if (many) {
        return availableFields.FieldArray;
    }
    return builtInTypes[type] || availableFields.FieldString;
};
/**
 * Get the default widget for a given field object.
 *
 * @param {boolean} choices - True if the field has choices.
 * @param {boolean} many - True if the field is many.
 * @param {boolean} readOnly - True if the field is read only.
 * @param {string} type - The Django field type.
 * @returns {import('@vueda/utils/filterLookups.js').WidgetComponent} The widget component.
 */
const getDefaultWidget = (choices, many, readOnly, type) => {
    if (readOnly) {
        return availableWidgets.WidgetReadOnly;
    }
    if (choices) {
        return availableWidgets.WidgetModel;
        // return WidgetMultiSelect;
    }
    if (type === "TextField" || many) {
        return availableWidgets.WidgetTextarea;
    }
    if (type === "IntegerRangeField") {
        return availableWidgets.WidgetSlider;
    }
    return defaultWidgets[type] || availableWidgets.WidgetInput;
};

/**
 * @typedef {object} UseFormModelRawState
 * @property {string[]} fields - The fields to display, either passed in or from config.
 * @property {string[]} expands - The fields to expand, either passed in or from config.
 * @property {{[fieldName:string]:import('@vueda/stores/storeModelInfo.js').FieldInfo}} fieldDetails - The merged fieldDetails, either passed in, from config or from server info.
 * @property {{[fieldName:string]:import('@vueda/stores/storeModelInfo.js').ExpandInfo}} expandDetails - The merged expandDetails, either passed in, from config or from server info.
 * @property {{[fieldName:string]:import('vue').Component}} fieldComponents - The field components to use, either passed in or as a result of fieldObject or expandObject.
 * @property {{[fieldName:string]: {[key:string]: any}}} fieldProps - The field props to use, either passed in or as a result of fieldObject or expandObject.
 * @property {{[fieldName:string]: import('vue').Component}} widgetComponents - The widget components to use, either passed in or as a result of fieldObject or expandObject.
 * @property {{[fieldName:string]: {[key:string]: any}}} widgetProps - The widget props to use, either passed in or as a result of fieldObject or expandObject.
 */

/**
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<UseFormModelRawState>>} UseFormModelState
 */

/**
 * @typedef {object} UseFormModelRawProps
 * @property {string} app - The app name to load form configuration for
 * @property {string} model - The model name to load form configuration for
 * @property {string|undefined} view - The view name if wanting to use view specific configuration.
 * @property {string[]|undefined} fields - The fields to display, if different from the default
 * @property {string[]|undefined} expands - The fields to expand, if different from the default
 * @property {{[fieldName:string]:import('@vueda/stores/storeModelInfo.js').FieldInfo}|undefiend} fieldDetails - The field details to use, if different from the default
 * @property {{[fieldName:string]:import('@vueda/stores/storeModelInfo.js').ExpandInfo}|undefined} expandDetails - The expand details to use, if different from the default
 * @property {{[fieldName:string]: [componentName:string, ()=>Promise<import('vue').Component>]}|undefined} fieldComponents - The field components to use, if different from the default, by field path
 * @property {{[fieldName:string]: {[key:string]: any}}|undefined} fieldProps - The field props to use, if different from the default, by field path
 * @property {{[fieldName:string]: ()=>Promise<import('vue').Component>}|undefined} widgetComponents - The widget components to use, if different from the default, by field path
 * @property {{[fieldName:string]: {[key:string]: any}}|undefined} widgetProps - The widget props to use, if different from the default, by field path
 */

/**
 * Using server model info and client model config, this hook provides the necessary reactive state for a form model.
 *
 * @param {import('vue').Reactive<UseFormModelRawProps>} props - The reactive arguments.
 * @returns {UseFormModelState} The reactive state.
 */
export function useFormModel(props) {
    const es = effectScope();
    const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), toRef(props, "view"));

    const state = reactive(
        /** @type {UseFormModelRawState} */ {
            fields: [],
            expands: [],
            fieldDetails: {},
            expandDetails: {},
            fieldComponents: shallowReactive({}),
            fieldProps: {},
            widgetComponents: shallowReactive({}),
            widgetProps: {},
        },
    );

    const assignStateObjectsIfChanged = (args) => {
        for (const key in args) {
            if (!isEqual(state[key], args[key])) {
                assignReactiveObject(state[key], args[key]);
            }
        }
    };

    watch(
        [
            () => modelConfig.config.fields,
            () => modelConfig.config.expands,
            () => modelConfig.config.fieldDetails,
            () => modelConfig.config.expandDetails,
            toRef(props, "fields"),
            toRef(props, "expands"),
            toRef(props, "fieldDetails"),
            toRef(props, "expandDetails"),
        ],
        () => {
            // props has priority over config
            const desiredFields = props.fields || modelConfig.config?.fields || [];
            const desiredExpands = props.expands || modelConfig.config?.expands || [];
            // details fields merge at the field property level
            const desiredFieldDetails = {};
            const desiredExpandDetails = {};
            for (const field of desiredFields) {
                desiredFieldDetails[field] = {
                    ...modelConfig.config?.fieldDetails?.[field],
                    ...props.fieldDetails?.[field],
                };
            }
            for (const expand of desiredExpands) {
                desiredExpandDetails[expand] = {
                    ...modelConfig.config?.expandDetails?.[expand],
                    ...props.expandDetails?.[expand],
                };
            }
            assignStateObjectsIfChanged({
                fields: desiredFields,
                expands: desiredExpands,
                fieldDetails: desiredFieldDetails,
                expandDetails: desiredExpandDetails,
            });
        },
        { immediate: true, deep: true },
    );

    // resolve the field/widget components and props from the fields, expands, and details
    watch(
        [toRef(state, "expands"), toRef(state, "fields"), toRef(state, "fieldDetails"), toRef(state, "expandDetails")],
        ([expands, fields, fieldDetails, expandDetails]) => {
            if (Object.keys(fieldDetails || {}).length && fields.length) {
                const fieldComponents = {};
                const fieldProps = {};
                const widgetComponents = {};
                const widgetProps = {};
                for (const expandName of deepUnref(expands) || []) {
                    const expandDetail = expandDetails[expandName];
                    if (!expandDetail) {
                        throw new Error(`Unknown expand ${expandName} specified for ${props.app}.${props.model}`);
                    }
                    if (!expandDetail.f) {
                        continue;
                    }
                    for (const [expandFieldName, expandFieldDetail] of Object.entries(expandDetail.f)) {
                        if (expandFieldName === "pk") {
                            continue;
                        }
                        const fieldName = `${expandName}__${expandFieldName}`;
                        es.run(() => {
                            fieldComponents[fieldName] = computed(() => {
                                return (
                                    props.fieldComponents?.[fieldName] ||
                                    djangoTypeToFieldComponent(expandFieldDetail.many, expandFieldDetail.type)
                                );
                            });
                            fieldProps[fieldName] = computed(() => {
                                return {
                                    ...{
                                        // useFormModel resolves type, the fields don't care about the server type.
                                        ...omit(expandFieldDetail, ["type"]),
                                        ...(defaultFieldsProps[expandFieldDetail.type] || {}),
                                    },
                                    ...(deepUnref(props.fieldProps?.[fieldName]) || {}),
                                    name: fieldName,
                                };
                            });
                            widgetComponents[fieldName] = computed(() => {
                                return (
                                    props.widgetComponents?.[fieldName] ||
                                    getDefaultWidget(
                                        expandFieldDetail.choices,
                                        expandFieldDetail.many,
                                        expandFieldDetail.readOnly,
                                        expandFieldDetail.type,
                                    )
                                );
                            });
                            widgetProps[fieldName] = computed(() => {
                                const baseProps = {
                                    ...(deepUnref(props.widgetProps?.[fieldName]) || {}),
                                    ...(defaultWidgetProps[expandFieldDetail.type] || {}),
                                };
                                if (expandFieldDetail.choices) {
                                    if (Array.isArray(expandFieldDetail.choices)) {
                                        baseProps.options = expandFieldDetail.choices;
                                    } else {
                                        baseProps.fieldApp = expandDetail.app_label;
                                        baseProps.fieldModel = expandDetail.model;
                                        baseProps.app = expandFieldDetail.appLabel;
                                        baseProps.model = expandFieldDetail.model;
                                        baseProps.fieldName = expandFieldName;
                                    }
                                }
                                return baseProps;
                            });
                        });
                    }
                }

                for (const fieldName of deepUnref(fields) || []) {
                    const fieldDetail = fieldDetails[fieldName];
                    if (!fieldDetail) {
                        throw new Error(`Unknown field ${fieldName} specified for ${props.app}.${props.model}`);
                    }
                    es.run(() => {
                        fieldComponents[fieldName] = computed(() => {
                            return (
                                props.fieldComponents?.[fieldName] ||
                                djangoTypeToFieldComponent(fieldDetail.many, fieldDetail.type)
                            );
                        });
                        fieldProps[fieldName] = computed(() => {
                            return {
                                ...{
                                    // useFormModel resolves type, the fields don't care about the server type.
                                    ...omit(fieldDetail, ["type"]),
                                    ...(defaultFieldsProps[fieldDetail.type] || {}),
                                },
                                ...(deepUnref(props.fieldProps?.[fieldName]) || {}),
                                name: fieldName,
                            };
                        });
                        widgetComponents[fieldName] = computed(() => {
                            return (
                                props.widgetComponents?.[fieldName] ||
                                getDefaultWidget(
                                    fieldDetail.choices,
                                    fieldDetail.many,
                                    fieldDetail.readOnly,
                                    fieldDetail.type,
                                )
                            );
                        });
                        widgetProps[fieldName] = computed(() => {
                            const baseProps = {
                                ...(deepUnref(props.widgetProps?.[fieldName]) || {}),
                                ...(defaultWidgetProps[fieldDetail.type] || {}),
                            };
                            if (fieldDetail.choices) {
                                if (Array.isArray(fieldDetail.choices)) {
                                    baseProps.options = fieldDetail.choices;
                                } else {
                                    baseProps.fieldApp = props.app;
                                    baseProps.fieldModel = props.model;
                                    baseProps.app = fieldDetail.appLabel;
                                    baseProps.model = fieldDetail.model;
                                    baseProps.fieldName = fieldName;
                                }
                            }
                            return baseProps;
                        });
                    });
                }
                assignStateObjectsIfChanged({
                    fieldComponents,
                    fieldProps,
                    widgetComponents,
                    widgetProps,
                });
            } else {
                assignStateObjectsIfChanged({
                    fieldComponents: {},
                    fieldProps: {},
                    widgetComponents: {},
                    widgetProps: {},
                });
            }
        },
        { deep: true },
    );
    const returnObject = readonly(state);
    provide(FormModelSymbol, returnObject);
    return returnObject;
}
