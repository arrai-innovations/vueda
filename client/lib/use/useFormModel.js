import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { availableFields, availableWidgets } from "@vueda/utils/formLookups.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, provide, reactive, readonly, shallowReactive, toRef, watch } from "vue";
import { deepUnref } from "vue-deepunref";

const defaultFieldMappings = {
    BooleanField: {
        BooleanField: { component: availableFields.FieldBoolean, widget: availableWidgets.WidgetCheckbox },
    },
    CharField: {
        CharField: { component: availableFields.FieldString, widget: availableWidgets.WidgetInput },
        TextField: { component: availableFields.FieldString, widget: availableWidgets.WidgetTextarea },
    },
    DateField: {
        DateField: { component: availableFields.FieldDate, widget: availableWidgets.WidgetDatePicker },
    },
    DateTimeField: {
        DateTimeField: {
            component: availableFields.FieldDateTime,
            widget: availableWidgets.WidgetDatePicker,
            widgetProps: { showTime: true },
        },
    },
    DecimalField: {
        DecimalField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "number" },
        },
        PositiveDecimalField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "number" },
        },
    },
    DurationSecondsField: {
        DurationField: {
            component: availableFields.FieldDuration,
            widget: availableWidgets.WidgetDuration,
            widgetProps: { unit: "minutes" },
        },
    },
    DurationField: {
        DurationField: {
            component: availableFields.FieldDuration,
            widget: availableWidgets.WidgetDuration,
            fieldProps: { manyComponent: availableFields.FieldDuration },
        },
    },
    EmailField: {
        EmailField: {
            component: availableFields.FieldEmail,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "email" },
        },
    },
    FileField: {
        FileField: { component: availableFields.FieldFile, widget: availableWidgets.WidgetFile },
    },
    FloatField: {
        FloatField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "number" },
        },
    },
    ImageField: {
        ImageField: { component: availableFields.FieldImage, widget: availableWidgets.WidgetImage },
    },
    IntegerField: {
        AutoField: { component: availableFields.FieldString, widget: availableWidgets.WidgetInput },
        BigAutoField: { component: availableFields.FieldString, widget: availableWidgets.WidgetInput },
        BigIntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "number" },
        },
        IntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "number" },
        },
        PositiveBigIntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "number" },
        },
        PositiveIntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "number" },
        },
        PositiveSmallIntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "number" },
        },
        SmallIntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "number" },
        },
    },
    IPAddressField: {
        IPAddressField: { component: availableFields.FieldIP, widget: availableWidgets.WidgetIP },
        GenericIPAddressField: { component: availableFields.FieldIP, widget: availableWidgets.WidgetIP },
    },
    JSONField: {
        JSONField: { component: availableFields.FieldObject, widget: availableWidgets.WidgetJSON, fieldProps: {} },
    },
    RangeField: {
        DateRangeField: {
            component: availableFields.FieldRange,
            widget: availableWidgets.WidgetDatePicker,
            widgetProps: { selectionMode: "range" },
        },
        DateTimeRangeField: {
            component: availableFields.FieldRange,
            widget: availableWidgets.WidgetDatePicker,
            widgetProps: { type: "number" },
        },
        FloatRangeField: {
            component: availableFields.FieldSetRange,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "number" },
            fieldProps: { boundaryComponent: availableFields.FieldNumber },
        },
        IntegerRangeField: {
            component: availableFields.FieldSetRange,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "number" },
            fieldProps: { boundaryComponent: availableFields.FieldNumber },
        },
        TimeRangeField: {
            component: availableFields.FieldRange,
            widget: availableWidgets.WidgetDatePicker,
            widgetProps: { timeOnly: true, hourFormat: "12" },
        },
    },
    ManyRelatedField: {
        ManyToManyField: {
            component: null,
            widget: availableWidgets.WidgetSearchableSelect,
            widgetProps: { multiple: true },
            fieldProps: {
                requiredFn: (value) => {
                    if (Array.isArray(value)) {
                        return value.length;
                    } else {
                        return value !== null && value !== undefined && Object.keys(value).length > 0;
                    }
                },
            },
        },
        ManyRelatedField: {
            component: null,
            widget: availableWidgets.WidgetSearchableSelect,
            widgetProps: { multiple: true },
            fieldProps: {
                requiredFn: (value) => {
                    if (Array.isArray(value)) {
                        return value.length;
                    } else {
                        return value !== null && value !== undefined && Object.keys(value).length > 0;
                    }
                },
            },
        },
    },
    NullBooleanField: {
        NullBooleanField: {
            component: availableFields.FieldBoolean,
            widget: availableWidgets.WidgetTriStateCheckbox,
            fieldProps: { nullable: true },
        },
    },
    PrimaryKeyRelatedField: {
        ForeignKey: { component: availableFields.FieldString, widget: availableWidgets.WidgetSearchableSelect },
        OneToOneField: { component: availableFields.FieldString, widget: availableWidgets.WidgetSearchableSelect },
        RelatedField: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetSearchableSelect,
            widgetProps: { multiple: true },
        },
    },
    SerializerField: {
        BinaryField: { component: null, widget: null, fieldProps: {} },
    },
    SerializerMethodField: {
        GenericForeignKey: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetGenericAutoComplete,
            fieldProps: {},
        },
        GenericRelation: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetGenericAutoComplete,
            fieldProps: {},
        },
    },
    SlugField: {
        SlugField: { component: availableFields.FieldSlug, widget: availableWidgets.WidgetInput, fieldProps: {} },
    },
    TimeField: {
        TimeField: {
            component: availableFields.FieldTime,
            widget: availableWidgets.WidgetDatePicker,
            widgetProps: { timeOnly: true, hourFormat: "12" },
            fieldProps: {},
        },
    },
    URLField: {
        URLField: {
            component: availableFields.FieldURL,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "url" },
            fieldProps: {},
        },
    },
    UUIDField: {
        UUIDField: {
            component: availableFields.FieldUUID,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "mask", mask: "****-****-****-****-************" },
            fieldProps: {},
        },
    },
};

const choiceFieldMappings = {
    BooleanField: {
        BooleanField: { widget: availableWidgets.WidgetRadio, manyWidget: availableWidgets.WidgetRadio },
    },
    CharField: {
        CharField: { widget: availableWidgets.WidgetSelect, manyWidget: availableWidgets.WidgetMultiSelect },
        TextField: { widget: availableWidgets.WidgetSelect, manyWidget: availableWidgets.WidgetMultiSelect },
    },
    ChoiceField: {
        CharField: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetSelect,
            manyWidget: availableWidgets.WidgetMultiSelect,
        },
        TextField: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetSelect,
            manyWidget: availableWidgets.WidgetMultiSelect,
        },
    },
    EmailField: {
        EmailField: { widget: availableWidgets.WidgetInput, widgetProps: { type: "email" } },
    },
    ManyRelatedField: {
        ManyToManyField: {
            widget: availableWidgets.WidgetSearchableSelect,
            manyWidget: availableWidgets.WidgetSearchableSelect,
            manyWidgetProps: { multiple: true },
        },
        ManyRelatedField: {
            widget: availableWidgets.WidgetSearchableSelect,
            manyWidget: availableWidgets.WidgetSearchableSelect,
            manyWidgetProps: { multiple: true },
        },
    },
    NullBooleanField: {
        NullBooleanField: { widget: availableWidgets.WidgetTriStateCheckbox },
    },
    PrimaryKeyRelatedField: {
        ForeignKey: { widget: availableWidgets.WidgetSearchableSelect },
        OneToOneField: { widget: availableWidgets.WidgetSearchableSelect },
        RelatedField: {
            widget: availableWidgets.WidgetSearchableSelect,
            manyWidget: availableWidgets.WidgetSearchableSelect,
            manyWidgetProps: { multiple: true },
        },
    },
    SerializerMethodField: {
        GenericForeignKey: {
            widget: availableWidgets.WidgetSearchableSelect,
            widgetMany: availableWidgets.WidgetSearchableSelect,
        },
        GenericRelation: {
            widget: availableWidgets.WidgetSearchableSelect,
            widgetMany: availableWidgets.WidgetSearchableSelect,
        },
    },
    SlugField: {
        SlugField: { widget: availableWidgets.WidgetSelect, widgetMany: availableWidgets.WidgetMultiSelect },
    },
    URLField: {
        URLField: { widget: availableWidgets.WidgetSelect, widgetMany: availableWidgets.WidgetMultiSelect },
    },
};

const manyFieldMappings = {
    BooleanField: {
        BooleanField: {
            fieldProps: { manyComponent: availableFields.FieldBoolean },
            widget: availableWidgets.WidgetCheckbox,
        },
    },
    CharField: {
        CharField: { widget: availableWidgets.WidgetInput, fieldProps: { manyComponent: availableFields.FieldString } },
        TextField: {
            widget: availableWidgets.WidgetTextarea,
            fieldProps: { manyComponent: availableFields.FieldString },
        },
    },
    DateField: {
        DateField: {
            widget: availableWidgets.WidgetDatePickerm,
            fieldProps: { manyComponent: availableFields.FieldDate },
        },
    },
    DateTimeField: {
        DateTimeField: {
            widget: availableWidgets.WidgetDatePicker,
            fieldProps: { manyComponent: availableFields.FieldDateTime },
        },
    },
    DecimalField: {
        DecimalField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldNumber },
        },
        PositiveDecimalField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldNumber },
        },
    },
    DurationSecondsField: {
        DurationField: {
            widget: availableWidgets.WidgetDuration,
            fieldProps: { manyComponent: availableFields.FieldDuration },
        },
    },
    DurationField: {
        DurationField: {
            widget: availableWidgets.WidgetDuration,
            fieldProps: { manyComponent: availableFields.FieldDuration },
        },
    },
    EmailField: {
        EmailField: { widget: availableWidgets.WidgetInput, fieldProps: { manyComponent: availableFields.FieldEmail } },
    },
    FileField: {
        FileField: { widget: availableWidgets.WidgetFile, fieldProps: { manyComponent: availableFields.FieldString } },
    },
    FloatField: {
        FloatField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldNumber },
        },
    },
    ImageField: {
        ImageField: { widget: availableWidgets.WidgetImage, fieldProps: { manyComponent: availableFields.FieldImage } },
    },
    IntegerField: {
        AutoField: { widget: availableWidgets.WidgetInput, fieldProps: { manyComponent: availableFields.FieldString } },
        BigAutoField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldString },
        },
    },
    IntegerRangeField: {
        IntegerRangeField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldSetRange },
        },
    },
    IPAddressField: {
        IPAddressField: { widget: availableWidgets.WidgetIP, fieldProps: { manyComponent: availableFields.FieldIP } },
        GenericIPAddressField: {
            widget: availableWidgets.WidgetIP,
            fieldProps: { manyComponent: availableFields.FieldIP },
        },
    },
    JSONField: {
        JSONField: { widget: availableWidgets.WidgetJSON, fieldProps: { manyComponent: availableFields.FieldObject } },
    },
    DateRangeField: {
        DateRangeField: {
            widget: availableWidgets.WidgetDatePicker,
            fieldProps: { manyComponent: availableFields.FieldSetRange },
        },
    },
    NullBooleanField: {
        NullBooleanField: {
            widget: availableWidgets.WidgetTriStateCheckbox,
            fieldProps: { manyComponent: availableFields.FieldBoolean },
        },
    },
    SlugField: {
        SlugField: { widget: availableWidgets.WidgetInput, fieldProps: { manyComponent: availableFields.FieldString } },
    },
    TimeField: {
        TimeField: {
            widget: availableWidgets.WidgetDatePicker,
            fieldProps: { manyComponent: availableFields.FieldTime },
        },
    },
    TimeRangeField: {
        TimeRangeField: {
            widget: availableWidgets.WidgetDatePicker,
            fieldProps: { manyComponent: availableFields.FieldSetRange },
        },
    },
    URLField: {
        URLField: { widget: availableWidgets.WidgetInput, fieldProps: { manyComponent: availableFields.FieldURL } },
    },
    UUIDField: {
        UUIDField: { widget: availableWidgets.WidgetInput, fieldProps: { manyComponent: availableFields.FieldUUID } },
    },
};

/**
 * Get the field component for a given Django field type.
 *
 * @param {boolean} many - True if the field is many.
 * @param {Object} field - The field detail object
 * @returns {import('@vueda/utils/filterLookups.js').FieldComponent} The field component.
 */
const djangoTypeToFieldComponent = (field) => {
    let component;
    if (field.choices) {
        component = choiceFieldMappings[field.typeSerializer]?.[field.typeModel]?.component;
    } else if (field.many) {
        component =
            manyFieldMappings[field.typeSerializer]?.[field.typeModel]?.component || availableFields.FieldSetMany;
    }
    return component || defaultFieldMappings[field.typeSerializer]?.[field.typeModel]?.component;
};
/**
 * Get the default widget for a given field object.
 *
 * @param {object} field - Object that contains detail of a field
 * @returns {import('@vueda/utils/filterLookups.js').WidgetComponent} The widget component.
 */
const getDefaultWidget = (field) => {
    // if (field.readOnly) {
    //     return availableWidgets.WidgetReadOnly;
    // }
    let widget;
    if (field.choices) {
        const fieldObject = choiceFieldMappings[field.typeSerializer]?.[field.typeModel];
        widget = field.many ? fieldObject?.manyWidget : fieldObject?.widget;
    } else if (field.many) {
        widget = manyFieldMappings[field.typeSerializer]?.[field.typeModel]?.widget;
    }
    return widget ?? defaultFieldMappings[field.typeSerializer]?.[field.typeModel]?.widget;
};

/**
 * Get the default widget props for a given field object.
 *
 * @param {object} field - Object that contains detail of a field
 * @returns {{[fieldName:string]: {[key:string]: any}}|undefined} widgetProps - The default widget props
 */
const getDefaultWidgetProps = (field) => {
    let baseProps;
    if (field.choices) {
        baseProps = field.many ? choiceFieldMappings[field.typeSerializer]?.[field.typeModel]?.manyWidgetProps : {};
    } else if (field.many) {
        baseProps = manyFieldMappings[field.typeSerializer]?.[field.typeModel]?.widgetProps;
    }
    return { ...defaultFieldMappings[field.typeSerializer]?.[field.typeModel]?.widgetProps, ...(baseProps ?? {}) };
};

/**
 * Get the default field props for a given field object.
 *
 * @param {object} field - Object that contains detail of a field
 * @returns {{[fieldName:string]: {[key:string]: any}}|undefined} fieldProps - The default field props
 */
const getDefaultFieldsProps = (field) => {
    let baseProps;
    if (field.many && !field.choices) {
        baseProps = manyFieldMappings[field.typeSerializer]?.[field.typeModel]?.fieldProps;
    }
    return { ...defaultFieldMappings[field.typeSerializer]?.[field.typeModel]?.fieldProps, ...(baseProps ?? {}) };
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

const isExpandedFieldName = (fieldName) => fieldName.includes("__");

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
            fieldProps: shallowReactive({}),
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
            () => modelConfig.config.displayFields,
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
            const desiredFields = props.fields || modelConfig.config?.displayFields || [];
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
                const allFields = [];
                const unrefExpands = deepUnref(expands) || [];
                let anySpecifiedExpands = false;
                for (const fieldName of deepUnref(fields) || []) {
                    const item = {
                        fieldName,
                        fieldDetail: fieldDetails[fieldName],
                        isExpandedField: isExpandedFieldName(fieldName),
                        baseExpanded: unrefExpands.includes(fieldName),
                        expandName: null,
                    };
                    if (item.isExpandedField) {
                        anySpecifiedExpands = true;
                        // we don't deal with nested expands. we might need to in the future
                        [item.expandName, item.expandFieldName] = fieldName.split("__", 1);
                        item.expandDetail = expandDetails[item.expandName];
                        if (!item.expandDetail) {
                            throw new Error(
                                `Unknown expand ${item.expandName} specified for ${props.app}.${props.model}`,
                            );
                        }
                        item.fieldDetail = item.expandDetail.f[item.expandFieldName];
                        if (!item.fieldDetail) {
                            throw new Error(
                                `Unknown field ${item.expandFieldName} specified for expand ${item.expandName} on ${props.app}.${props.model}`,
                            );
                        }
                    }
                    if (!item.fieldDetail) {
                        throw new Error(`Unknown field ${fieldName} specified for ${props.app}.${props.model}`);
                    }
                    allFields.push(item);
                }
                if (!anySpecifiedExpands && unrefExpands.length) {
                    // if you didn't ask for any expand fields manually, but you did specify an expands,
                    //  add all expansion fields
                    for (const expandName of unrefExpands) {
                        const baseIndex = allFields.findIndex((item) => item.fieldName === expandName);
                        if (baseIndex === -1) {
                            continue;
                        }
                        const baseItem = allFields[baseIndex];
                        for (const [expandFieldName, expandFieldDetail] of Object.entries(
                            expandDetails[expandName].f,
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
                    es.run(() => {
                        fieldComponents[fieldName] = computed(() => {
                            const component =
                                props.fieldComponents?.[fieldName] ||
                                modelConfig?.config?.fieldComponents?.[fieldName] ||
                                (baseExpanded && fieldDetail.many
                                    ? availableFields.FieldSetStackedInline
                                    : djangoTypeToFieldComponent(fieldDetail));
                            if (typeof component === "string") {
                                // let props and modelConfig not pass actual components
                                return availableFields[component];
                            }
                            return component;
                        });
                        fieldProps[fieldName] = computed(() => {
                            return {
                                // useFormModel resolves type, the fields don't care about the server type.
                                ...omit(fieldDetail, ["type"]),
                                ...(getDefaultFieldsProps(fieldDetail) || {}),
                                ...(deepUnref(modelConfig.config?.fieldProps?.[fieldName]) || {}),
                                ...(deepUnref(props.fieldProps?.[fieldName]) || {}),
                                name: fieldName,
                            };
                        });
                        widgetComponents[fieldName] = computed(() => {
                            if (baseExpanded) {
                                return null;
                            }
                            const component =
                                props.widgetComponents?.[fieldName] ||
                                modelConfig?.config?.widgetComponents?.[fieldName] ||
                                getDefaultWidget(fieldDetail);
                            if (typeof component === "string") {
                                // Allow props and modelConfig to pass component names
                                return availableWidgets[component];
                            }
                            return component;
                        });
                        widgetProps[fieldName] = computed(() => {
                            if (baseExpanded) {
                                return {};
                            }
                            const baseProps = {
                                ...(getDefaultWidgetProps(fieldDetail) || {}),
                                ...(deepUnref(modelConfig.config?.widgetProps?.[fieldName]) || {}),
                                ...(deepUnref(props.widgetProps?.[fieldName]) || {}),
                            };
                            if (fieldDetail.choices) {
                                if (Array.isArray(fieldDetail.choices)) {
                                    baseProps.options = fieldDetail.choices;
                                } else {
                                    if (isExpandedField) {
                                        const { expandDetail, expandFieldName } = field;
                                        baseProps.fieldApp = expandDetail.app_label;
                                        baseProps.fieldModel = expandDetail.model;
                                        baseProps.app = fieldDetail.appLabel;
                                        baseProps.model = fieldDetail.model;
                                        baseProps.fieldName = expandFieldName;
                                    } else {
                                        baseProps.fieldApp = props.app;
                                        baseProps.fieldModel = props.model;
                                        baseProps.app = fieldDetail.appLabel;
                                        baseProps.model = fieldDetail.model;
                                        baseProps.fieldName = fieldName;
                                    }
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
