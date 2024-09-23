/* eslint-disable vue/return-in-computed-property */
import { assignReactiveObject, keyDiff } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { memoizedStartCase } from "@vueda/utils/crudSupport.js";
import { filterExpressions } from "@vueda/utils/filterLookups.js";
import { availableFields, availableWidgets } from "@vueda/utils/formLookups.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, reactive, readonly, ref, shallowReactive, shallowRef, toRef, watch } from "vue";
import { deepUnref } from "vue-deepunref";

const filterFieldClassAndModelTypeToFieldComponent = {
    ChoiceField: {
        CharField: availableFields.FieldString,
        TextField: availableFields.FieldString,
        EmailField: availableFields.FieldEmail,
        UUIDField: availableFields.FieldString,
        URLField: availableFields.FieldString,
        SlugField: availableFields.FieldString,
    },
    CharField: {
        CharField: availableFields.FieldString,
        TextField: availableFields.FieldString,
        EmailField: availableFields.FieldEmail,
        UUIDField: availableFields.FieldString,
        URLField: availableFields.FieldString,
        SlugField: availableFields.FieldString,
    },
    NullBooleanField: {
        BooleanField: availableFields.FieldBoolean,
    },
    DateField: {
        DateField: availableFields.FieldDate,
    },
    DateTimeField: {
        DateTimeField: availableFields.FieldDateTime,
    },
    TimeField: {
        TimeField: availableFields.FieldTime,
    },
    ModelChoiceField: {
        ForeignKeyField: availableFields.FieldString,
        OneToOneField: availableFields.FieldString,
    },
    ModelMultipleChoiceField: {
        ManyToManyField: availableFields.FieldString,
    },
    NumberField: {
        DecimalField: availableFields.FieldNumber,
        FloatField: availableFields.FieldNumber,
        IntegerField: availableFields.FieldNumber,
        PositiveIntegerField: availableFields.FieldNumber,
        PositiveSmallIntegerField: availableFields.FieldNumber,
        SmallIntegerField: availableFields.FieldNumber,
        DurationSecondsField: availableFields.FieldNumber,
    },
    NumberRangeField: {
        DecimalField: availableFields.FieldSetRange,
        FloatField: availableFields.FieldSetRange,
        IntegerField: availableFields.FieldSetRange,
        PositiveIntegerField: availableFields.FieldSetRange,
        PositiveSmallIntegerField: availableFields.FieldSetRange,
        SmallIntegerField: availableFields.FieldSetRange,
        DurationSecondsField: availableFields.FieldSetRange,
    },
    RangeField: {
        DecimalField: availableFields.FieldSetRange,
        FloatField: availableFields.FieldSetRange,
        IntegerField: availableFields.FieldSetRange,
        PositiveIntegerField: availableFields.FieldSetRange,
        DurationSecondsField: availableFields.FieldSetRange,
    },
    UUIDField: {
        UUIDField: availableFields.FieldString,
    },
    DateRangeField: {
        DateField: availableFields.FieldRange,
    },
    DateTimeRangeField: {
        DateTimeField: availableFields.FieldRange,
    },
    DateFromToRangeFilter: {
        DateField: availableFields.FieldRange,
        DateTimeField: availableFields.FieldRange,
    },
    TimeRangeField: {
        TimeField: availableFields.FieldRange,
    },
    IsoDateTimeRangeField: {
        IsoDateTimeRangeField: availableFields.FieldRange,
    },
};

/**
 * Get the field component for a given Django field type.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo} filter_info - The Django field class.
 * @returns {import('@vueda/utils/filterLookups.js').FieldComponent} The field component.
 */
const getFieldComponent = (filter_info) => {
    const returnComponent =
        filterFieldClassAndModelTypeToFieldComponent[filter_info.typeFilter]?.[filter_info.typeModel];
    return returnComponent ?? availableFields.FieldString;
};

const defaultWidgets = {
    ChoiceField: availableWidgets.WidgetSelect,
    CharField: availableWidgets.WidgetInput,
    NullBooleanField: availableWidgets.WidgetTriStateCheckbox,
    DateField: availableWidgets.WidgetDatePicker,
    DateTimeField: availableWidgets.WidgetDatePicker,
    TimeField: availableWidgets.WidgetDatePicker,
    ModelChoiceField: availableWidgets.WidgetSelect,
    ModelMultipleChoiceField: availableWidgets.WidgetSelect,
    NumberField: availableWidgets.WidgetInput,
    NumberRangeField: availableWidgets.WidgetInput,
    RangeField: availableWidgets.WidgetInput,
    UUIDField: availableWidgets.WidgetInput,
    DateRangeField: availableWidgets.WidgetDatePicker,
    DateTimeRangeField: availableWidgets.WidgetDatePicker,
    DateFromToRangeFilter: availableWidgets.WidgetDatePicker,
    TimeRangeField: availableWidgets.WidgetDatePicker,
    IsoDateTimeRangeField: availableWidgets.WidgetDatePicker,
};

/**
 * Get the widget component
 * @param {string} field_class - The Django field class.
 * @param {boolean|undefined} choices - If the field has choices.
 * @returns {import('@vueda/utils/filterLookups.js').WidgetComponent} The widget component.
 */
const getWidgetComponent = (field_class) => {
    return defaultWidgets[field_class] || availableWidgets.WidgetInput;
};

const defaultWidgetProps = {
    ChoiceField: {
        EmailField: { type: "email" },
        UUIDField: { type: "mask", mask: "****-****-****-****-************" },
        URLField: { type: "url" },
    },
    CharField: {
        EmailField: { type: "email" },
        UUIDField: { type: "mask", mask: "****-****-****-****-************" },
        URLField: { type: "url" },
    },
    DateTimeField: {
        DateTimeField: { showTime: true },
    },
    TimeField: {
        TimeField: { timeOnly: true },
    },
    NumberField: {
        DurationSecondsField: { unit: "minutes" },
    },
    NumberRangeField: {
        DecimalField: { type: "number" },
        FloatField: { type: "number" },
        IntegerField: { type: "number" },
        PositiveIntegerField: { type: "number" },
        PositiveSmallIntegerField: { type: "number" },
        SmallIntegerField: { type: "number" },
        DurationSecondsField: { unit: "minutes" },
    },
    RangeField: {
        DecimalField: { type: "number" },
        FloatField: { type: "number" },
        IntegerField: { type: "number" },
        PositiveIntegerField: { type: "number" },
        DurationSecondsField: { unit: "minutes" },
    },
    UUIDField: {
        UUIDField: { type: "mask", mask: "****-****-****-****-************" },
    },
    DateRangeField: {
        DateField: { selectionMode: "range" },
    },
    DateFromToRangeFilter: {
        DateField: { selectionMode: "range" },
        DateTimeField: { selectionMode: "range", showTime: true },
    },
    DateTimeRangeField: {
        DateTimeField: { selectionMode: "range", showTime: true },
    },
    TimeRangeField: {
        TimeField: { selectionMode: "range", timeOnly: true },
    },
};

const getDefaultFieldProps = (filterableDetail) => {
    const defaultProps = defaultFieldProps[filterableDetail.typeFilter]?.[filterableDetail.typeModel] || {};
    const baseProps = {
        ...omit(filterableDetail, ["typeModel", "typeDB", "typeFilter", "suffixes"]),
        ...defaultProps,
        rangeSuffix: filterableDetail.suffixes,
    };
    if (filterableDetail.suffixes) {
        baseProps.rangeSuffix = filterableDetail.suffixes;
    }
    return baseProps;
};

const defaultFieldProps = {
    NumberRangeField: {
        DecimalField: { boundaryComponent: availableFields.FieldNumber },
        FloatField: { boundaryComponent: availableFields.FieldNumber },
        IntegerField: { boundaryComponent: availableFields.FieldNumber },
        PositiveIntegerField: { boundaryComponent: availableFields.FieldNumber },
        PositiveSmallIntegerField: { boundaryComponent: availableFields.FieldNumber },
        SmallIntegerField: { boundaryComponent: availableFields.FieldNumber },
    },
    RangeField: {
        DecimalField: { boundaryComponent: availableFields.FieldNumber },
        FloatField: { boundaryComponent: availableFields.FieldNumber },
        IntegerField: { boundaryComponent: availableFields.FieldNumber },
        PositiveIntegerField: { boundaryComponent: availableFields.FieldNumber },
    },
    UUIDField: {
        UUIDField: { type: "mask", mask: "****-****-****-****-************" },
    },
    NullBooleanField: {
        BooleanField: { nullable: true },
    },
};

/**
 * @typedef {{[fieldName:string]: import('@vueda/stores/storeModelInfo.js').FilterInfo}} FilterInfoByName
 */

/**
 * @typedef {object} UseFilterFormRaw
 * @property {string[]} filterables - The fields to display
 * @property {import('vue').Ref<FilterInfoByName>} filterableDetails - The field details
 * @property {{[fieldName:string]:import('vue').Component}} fieldComponents -
 * @property {{[fieldName:string]: {[key:string]: any}}} fieldProps -
 * @property {{[fieldName:string]: import('vue').Component}} widgetComponents - The widget components
 * @property {{[fieldName:string]: {[key:string]: any}}} widgetProps -
 */

/**
 * @typedef {readonly<import('vue').shallowReactive<UseFilterFormRaw>>} UseFilterForm
 */

/**
 * @typedef {object} UseFilterFormRawProps
 * @property {string} app - The app name
 * @property {string} model - The model name
 * @property {string|undefined} view - The view name
 * @property {string[]|undefined} filterables - The fields to display
 * @property {FilterInfoByName|undefined} filterableDetails - The field details
 * @property {{[fieldName:string]: [componentName:string, ()=>Promise<import('vue').Component>]}|undefined} fieldComponents - The field components to use, if different from the default, by filterable name
 * @property {{[fieldName:string]: {[key:string]: any}}|undefined} fieldProps - The field props to use, if different from the default, by filterable name
 * @property {{[fieldName:string]: ()=>Promise<import('vue').Component>}|undefined} widgetComponents - The widget components to use, if different from the default, by filterable name
 * @property {{[fieldName:string]: {[key:string]: any}}|undefined} widgetProps - The widget props to use, if different from the default, by filterable name
 */

/**
 * Using server model info and client model config, this hook provides the necessary reactive state for a form model.
 *
 * @param {import('vue').<UseFilterFormRawProps>} props - The reactive arguments.
 * @returns {UseFilterForm} The reactive state.
 */
export default function useFilterForm(props) {
    const es = effectScope();
    const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), toRef(props, "view"));
    const state = shallowReactive(
        /** @type {UseFilterFormRaw} */ {
            filterables: ref([]),
            filterableDetails: ref({}),
            // components themselves should not be deep reactive, avoiding vue warnings
            fieldComponents: shallowRef({}),
            fieldProps: reactive({}),
            widgetComponents: shallowRef({}),
            widgetProps: reactive({}),
            filterableOptions: ref([]), // the options for the user to pick from
            widgetOptions: ref([]),
        },
    );

    const assignStateObjectsIfChanged = (args) => {
        for (const key in args) {
            if (!isEqual(state[key], args[key])) {
                assignReactiveObject(state[key], args[key]);
            }
        }
    };

    // resolve the names and detail overrides from props over config
    watch(
        [
            () => deepUnref(modelConfig.config.filterables),
            () => deepUnref(modelConfig.config.filterableDetails),
            () => deepUnref(props.filterables),
            () => deepUnref(props.filterableDetails),
        ],
        (
            [newConfigFilterables, newConfigFilterableDetails, newPropsFilterables, newPropsFilterableDetails],
            [oldConfigFilterables, oldConfigFilterableDetails, oldPropsFilterables, oldPropsFilterableDetails],
        ) => {
            // performance ordering the equality checks, lists of strings before objects
            if (
                isEqual(newPropsFilterables, oldPropsFilterables) &&
                isEqual(newConfigFilterables, oldConfigFilterables) &&
                isEqual(newPropsFilterableDetails, oldPropsFilterableDetails) &&
                isEqual(newConfigFilterableDetails, oldConfigFilterableDetails)
            ) {
                return;
            }
            // props has priority over config
            const desiredFilterables = newPropsFilterables || newConfigFilterables;
            // detail fields merge at the property level
            const desiredFilterableDetails = {};
            const {
                addedKeys: overrideKeys,
                sameKeys: bothKeys,
                removedKeys: defaultKeys,
            } = keyDiff(Object.keys(newPropsFilterableDetails || {}), Object.keys(newConfigFilterableDetails || {}));
            for (const key of bothKeys) {
                desiredFilterableDetails[key] = {
                    ...(newConfigFilterableDetails?.[key] || {}),
                    ...newPropsFilterableDetails?.[key],
                };
            }
            for (const key of defaultKeys) {
                desiredFilterableDetails[key] = newConfigFilterableDetails?.[key];
            }
            for (const key of overrideKeys) {
                desiredFilterableDetails[key] = newPropsFilterableDetails?.[key];
            }
            assignStateObjectsIfChanged({
                filterables: desiredFilterables,
                filterableDetails: desiredFilterableDetails,
            });
        },
    );

    // resolve the components and props from the filterables and filterableDetails
    watch(
        [() => deepUnref(state.filterables), () => deepUnref(state.filterableDetails)],
        ([filterables, filterableDetails]) => {
            if (filterables?.length) {
                const fieldComponents = {};
                const fieldProps = {};
                const widgetComponents = {};
                const widgetProps = {};
                const options = [];
                // todo: build options somehow...
                for (const filterableName of filterables) {
                    const filterableDetail = filterableDetails[filterableName];
                    if (!filterableDetail) {
                        throw new Error(`Unknown filterable ${filterableName} for ${props.app}.${props.model}`);
                    }
                    const lookupExpressions = [];
                    for (const expression of filterExpressions) {
                        if (filterableDetail.lookupExprs.includes(expression.value)) {
                            lookupExpressions.push(expression);
                        }
                    }
                    const lookupExpressionsToParams = {};
                    for (const expression of lookupExpressions) {
                        es.run(() => {
                            const key = `${filterableName}__${expression.value}`;
                            lookupExpressionsToParams[expression.value] =
                                lookupExpressions.length > 1 ? key : filterableName;
                            if (filterableDetail.suffixes?.length) {
                                lookupExpressionsToParams[expression.value] = filterableDetail.suffixes.map(
                                    (suffix) => {
                                        return lookupExpressions.length > 1
                                            ? `${filterableName}_${suffix}__${expression.value}`
                                            : `${filterableName}_${suffix}`;
                                    },
                                );
                            }
                            fieldComponents[key] = computed(
                                () => props.fieldComponents?.[filterableName] || getFieldComponent(filterableDetail),
                            );
                            fieldProps[key] = computed(() => getDefaultFieldProps(filterableDetail));
                            widgetComponents[key] = computed(
                                () =>
                                    props.widgetComponents?.[filterableName] ||
                                    getWidgetComponent(filterableDetail.typeFilter),
                            );
                            widgetProps[key] = computed(() => {
                                const returnProps =
                                    defaultWidgetProps[filterableDetail.typeFilter]?.[filterableDetail.typeModel] || {};
                                if (filterableDetail.choices === true) {
                                    returnProps.fieldApp = props.app;
                                    returnProps.fieldModel = props.model;
                                    returnProps.app = filterableDetails.appLabel;
                                    returnProps.model = filterableDetails.model;
                                    returnProps.fieldName = filterableName;
                                } else if (filterableDetail.choices) {
                                    returnProps.options = filterableDetail.choices;
                                }
                                return returnProps;
                            });
                        });
                    }
                    options.push({
                        value: filterableName,
                        label: filterableDetail.label || memoizedStartCase(filterableName),
                        lookupExpressionsToParams,
                    });
                }
                assignStateObjectsIfChanged({
                    fieldComponents,
                    fieldProps,
                    widgetComponents,
                    widgetProps,
                    filterableOptions: options,
                });
            } else {
                assignStateObjectsIfChanged({
                    fieldComponents: {},
                    fieldProps: {},
                    widgetComponents: {},
                    widgetProps: {},
                    filterableOptions: [],
                });
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(state);
}
