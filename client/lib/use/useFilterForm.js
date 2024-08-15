/* eslint-disable vue/return-in-computed-property */
import { assignReactiveObject, keyDiff } from "@arrai-innovations/reactive-helpers";
import { storeModelChoices } from "@vueda/stores/storeModelChoices.js";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { getAppModelDotName, memoizedStartCase } from "@vueda/utils/crudSupport.js";
import { availableFields, availableWidgets, filterExpressions } from "@vueda/utils/filterLookups.js";
import { computedAsync } from "@vueuse/core";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, reactive, readonly, ref, shallowReactive, shallowRef, toRef, watch } from "vue";

const filterFieldClassToFieldComponent = {
    IntegerRangeField: availableFields.FieldRange,
    DateRangeField: availableFields.FieldRange,
    DateTimeRangeField: availableFields.FieldRange,
    TextField: availableFields.FieldString,
    CharField: availableFields.FieldString,
    BooleanField: availableFields.FieldBoolean,
    DateField: availableFields.FieldDate,
    DateTimeField: availableFields.FieldDateTime,
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
    DurationSecondsField: availableFields.FieldDuration,
    GenericRelation: availableFields.FieldString,
    GenericForeignKey: availableFields.FieldString,
    NullBooleanField: availableFields.FieldBoolean,
    PositiveBigIntegerField: availableFields.FieldNumber,
    PositiveDecimalField: availableFields.FieldNumber,
    ManyRelatedField: availableFields.FieldString,
};

/**
 * Get the field component for a given Django field type.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo.field_class} field_class - The Django field class.
 * @returns {import('@vueda/utils/filterLookups.js').FieldComponent} The field component.
 */
const getFieldComponent = (field_class) => {
    const returnComponent = filterFieldClassToFieldComponent[field_class];
    if (returnComponent) {
        return returnComponent;
    }
    return availableFields.FieldString;
};

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
    ForeignKey: availableWidgets.WidgetSelect,
    ManyToManyField: availableWidgets.WidgetMultiSelect,
    OneToOneField: availableWidgets.WidgetSelect,
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
    GenericRelation: availableWidgets.WidgetSelect,
    GenericForeignKey: availableWidgets.WidgetSelect,
    NullBooleanField: availableWidgets.WidgetCheckbox,
    PositiveBigIntegerField: availableWidgets.WidgetInput,
    PositiveDecimalField: availableWidgets.WidgetInput,
    ManyRelatedField: availableWidgets.WidgetMultiSelect,
};

/**
 * Get the widget component
 * @param {string} field_class - The Django field class.
 * @param {boolean|undefined} choices - If the field has choices.
 * @returns {import('@vueda/utils/filterLookups.js').WidgetComponent} The widget component.
 */
const getWidgetComponent = (field_class, choices) => {
    if (choices) {
        if (choices === true) {
            return availableWidgets.WidgetAutoComplete;
        }
        return availableWidgets.WidgetSelect;
    }
    return defaultWidgets[field_class] || availableWidgets.WidgetInput;
};

/**
 * @typedef {object} UseFilterFormRaw
 * @property {import('vue').Ref<import('@vueda/stores/storeModelConfig.js').ModelConfig.filterables>} filterables - The fields to display
 * @property {import('vue').Ref<{[fieldName:string]: import('@vueda/stores/storeModelInfo.js').FilterInfo}>} filterableDetails - The field details
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
 * @property {import('@vueda/stores/storeModelConfig.js').ModelConfig.filterables} filterables - The fields to display
 * @property {{[fieldName:string]: {[key:string]: any}}|null} filterableDetails - The field details
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
    const modelChoicesStore = storeModelChoices();
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
        },
    );

    const appModelKey = computed(() => getAppModelDotName({ app: props.app, model: props.model }));

    watch(
        [() => modelChoicesStore.choices[appModelKey.value], toRef(state, "widgetProps")],
        ([fieldChoices]) => {
            if (fieldChoices) {
                for (const field in fieldChoices) {
                    const choices = fieldChoices[field]?.results || [];
                    if (state.widgetProps[field]) {
                        if (!isEqual(state.widgetProps[field]?.options, choices)) {
                            state.widgetProps[field].options = choices;
                        }
                    }
                }
            }
        },
        { immediate: true, deep: true },
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
            () => modelConfig.config.filterables,
            () => modelConfig.config.filterableDetails,
            toRef(props, "filterables"),
            toRef(props, "filterableDetails"),
        ],
        (
            [newConfigFilterables, newConfigFilterableDetails, newFilterables, newFilterableDetails],
            [oldConfigFilterables, oldConfigFilterableDetails, oldFilterables, oldFilterableDetails],
        ) => {
            // performance ordering the equality checks, lists of strings before objects
            if (
                isEqual(newFilterables, oldFilterables) &&
                isEqual(newConfigFilterables, oldConfigFilterables) &&
                isEqual(newFilterableDetails, oldFilterableDetails) &&
                isEqual(newConfigFilterableDetails, oldConfigFilterableDetails)
            ) {
                return;
            }
            // props has priority over config
            const desiredFilterables = newFilterables || newConfigFilterables;
            // detail fields merge at the property level
            const desiredFilterableDetails = {};
            const {
                addedKeys: overrideKeys,
                sameKeys: bothKeys,
                removedKeys: defaultKeys,
            } = keyDiff(Object.keys(newFilterableDetails || {}), Object.keys(newConfigFilterableDetails || {}));
            for (const key of bothKeys) {
                desiredFilterableDetails[key] = {
                    ...(newConfigFilterableDetails?.[key] || {}),
                    ...newFilterableDetails?.[key],
                };
            }
            for (const key of defaultKeys) {
                desiredFilterableDetails[key] = newConfigFilterableDetails?.[key];
            }
            for (const key of overrideKeys) {
                desiredFilterableDetails[key] = newFilterableDetails?.[key];
            }
            assignStateObjectsIfChanged({
                filterables: desiredFilterables,
                filterableDetails: desiredFilterableDetails,
            });
        },
    );

    // resolve the components and props from the filterables and filterableDetails
    watch(
        [() => state.filterables, () => state.filterableDetails],
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
                        // todo: the data on the server will be getting refactored, hopefully for less indirection
                        if (
                            filterableDetail.filters.some((container) => {
                                return container.lookupExprs.includes(expression.value);
                            })
                        ) {
                            lookupExpressions.push(expression);
                        }
                    }
                    for (const expression of lookupExpressions) {
                        es.run(() => {
                            const key = `${filterableName}__${expression.value}`;
                            const fieldComponent = computed(
                                () =>
                                    props.fieldComponents[filterableName] ||
                                    getFieldComponent(filterableDetail.field_class),
                            );
                            fieldComponents[key] = computedAsync(async () => fieldComponent.value(), null);
                            fieldProps[key] = computed(() => {
                                const returnProps = {
                                    ...omit(filterableDetail, ["field_class", "type"]),
                                    type: filterableDetail.input_type,
                                };
                                if (!returnProps.label) {
                                    returnProps.label = memoizedStartCase(filterableName);
                                }
                                const includesTime = filterableDetail.field_class.includes("Time");
                                const includesDate = filterableDetail.field_class.includes("Date");
                                const includesRange = filterableDetail.field_class.includes("Range");
                                if (includesRange && (includesDate || includesTime)) {
                                    returnProps.rangeSuffix = ["after", "before"];
                                }
                                return returnProps;
                            });
                            const widgetComponent = computed(() => {
                                props.widgetProps[filterableName] ||
                                    getWidgetComponent(filterableDetail.field_class, filterableDetails.choices);
                            });
                            widgetComponents[key] = computedAsync(async () => widgetComponent.value(), null);
                            widgetProps[key] = computed(() => {
                                const returnProps = {};
                                const fieldClass = filterableDetail.field_class;
                                if (fieldClass === "BooleanField") {
                                    returnProps.options = filterableDetail.options || [
                                        { label: "True", value: true },
                                        { label: "False", value: false },
                                    ];
                                }
                                const includesTime = fieldClass.includes("Time");
                                const includesDate = fieldClass.includes("Date");
                                const includesRange = fieldClass.includes("Range");
                                if (includesRange && (includesTime || includesDate)) {
                                    returnProps.selectionMode = "range";
                                    returnProps.type = {
                                        DateRangeField: "date",
                                        DateTimeRangeField: "datetime-local",
                                        TimeRangeField: "time",
                                    }[fieldClass];
                                    if (includesDate && includesTime) {
                                        returnProps.showTime = true;
                                    }
                                }
                                return returnProps;
                            });
                        });
                    }
                    if (filterableDetail.choices) {
                        // noinspection JSIgnoredPromiseFromCall
                        modelChoicesStore.fetchChoices(props.app, props.model, filterableName);
                    }
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
