import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName, memoizedStartCase } from "@vueda/utils/crudSupport.js";
import { availableFields, availableWidgets, filterExpressions } from "@vueda/utils/filterLookups.js";
import identity from "lodash-es/identity.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, reactive, readonly, ref, shallowReactive, shallowRef, toRef, watch } from "vue";

const filterTypeToFieldComponent = {
    alpha: ["FieldString", availableFields.FieldString],
    boolean: ["FieldBoolean", availableFields.FieldBoolean],
    date: ["FieldDate", availableFields.FieldDate],
    datetime: ["FieldDateTime", availableFields.FieldDateTime],
    numeric: ["FieldNumber", availableFields.FieldNumber],
    time: ["FieldTime", availableFields.FieldTime],
};

/**
 * Get the field component for a given Django field type.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo} filterInfo - The field type.
 * @param {import('@vueda/utils/filterLookups.js').FilterExpression} lookupExpr - The field object.
 * @returns {[componentName:string, import('@vueda/utils/filterLookups.js').FieldComponent]|undefined} The field component.
 */
const getFieldComponent = (filterInfo /*, lookupExpr*/) => {
    const returnComponent = filterTypeToFieldComponent[filterInfo.type];
    if (returnComponent) {
        return returnComponent;
    }
    return ["FieldString", availableFields.FieldString];
};
/**
 * Get the field props for a given field object.
 * @param {string} fieldComponentName
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo} filterInfo
 * @param {FilterExpression} lookupExpr
 */
const getFieldProps = (fieldComponentName, filterInfo /*, lookupExpr*/) => {
    const returnProps = {
        ...omit(filterInfo, ["type"]),
    };
    if (!returnProps.label) {
        returnProps.label = memoizedStartCase(filterInfo.name);
    }
    if (fieldComponentName === "FieldRange" && ["date", "datetime"].includes(filterInfo.type)) {
        returnProps.type = filterInfo.type;
        returnProps.rangeSuffix = ["after", "before"];
    }
    return returnProps;
};

const fieldComponentToWidgetComponent = {
    FieldBoolean: ["WidgetSelect", availableWidgets.WidgetSelect],
    FieldDate: ["WidgetDatePicker", availableWidgets.WidgetDatePicker],
    FieldDateTime: ["WidgetDatePicker", availableWidgets.WidgetDatePicker],
    FieldNumber: ["WidgetSlider", availableWidgets.WidgetSlider],
    FieldString: ["WidgetInput", availableWidgets.WidgetInput],
    FieldTime: ["WidgetDatePicker", availableWidgets.WidgetInput],
};

/**
 * Get the widget component
 * @param {string} fieldComponentName
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo} filterInfo
 * @param {FilterExpression} lookupExpr
 */
const getWidgetComponent = (fieldComponentName, filterInfo, lookupExpr) => {
    if (filterInfo.choices) {
        console.log("getWidgetComponent", fieldComponentName, filterInfo, lookupExpr, "!WidgetSelect");
        return ["WidgetSelect", availableWidgets.WidgetSelect];
    }
    if (filterInfo.type === "numeric" && lookupExpr === "range") {
        console.log("getWidgetComponent", fieldComponentName, filterInfo, lookupExpr, "!WidgetSlider");
        return ["WidgetSlider", availableWidgets.WidgetSlider];
    }
    const returnComponent = fieldComponentToWidgetComponent[fieldComponentName] || [
        "WidgetInput",
        availableWidgets.WidgetInput,
    ];
    console.log("getWidgetComponent", fieldComponentName, filterInfo, lookupExpr, returnComponent[0]);
    return returnComponent;
};

/**
 * @param {string} fieldComponentName
 * @param {string} widgetComponentName
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo} filterInfo
 * @param {FilterExpression} lookupExpr
 */
const getWidgetProps = (fieldComponentName, widgetComponentName, filterInfo /*, lookupExpr*/) => {
    const returnProps = {};
    if (fieldComponentName === "FieldBoolean") {
        returnProps.options = returnProps.options || [
            { label: "True", value: true },
            { label: "False", value: false },
        ];
    }
    if (fieldComponentName === "FieldRange" && ["date", "datetime"].includes(filterInfo.type)) {
        returnProps.selectionMode = "range";
        if (filterInfo.type === "datetime") {
            returnProps.showTime();
        }
    }
    if (filterInfo.type === "time") {
        returnProps.type = "time";
    }
    return returnProps;
};

/**
 * @typedef {object} UseFormModelRawState
 * @property {import('vue').Ref<import('@vueda/stores/storeModelInfo.js').FilterInfo[]>} filterFields - The fields to display
 * @property {{[fieldName:string]:import('vue').Component}} fieldComponents -
 * @property {{[fieldName:string]: {[key:string]: any}}} fieldProps -
 * @property {{[fieldName:string]: import('vue').Component}} widgetComponents - The widget components
 * @property {{[fieldName:string]: {[key:string]: any}}} widgetProps -
 */

/**
 * @typedef {import('vue').shallowReactive<UseFormModelRawState>} UseFormModelState
 */

/**
 * @typedef {object} UseFilterFormRawProps
 * @property {string} app - The app name
 * @property {string} model - The model name
 * @property {string[]} filterFields - The fields to display
 */

const UseFilterFormStateKeys = ["fieldComponents", "fieldProps", "widgetComponents", "widgetProps"];
/**
 * Using server model info and client model config, this hook provides the necessary reactive state for a form model.
 *
 * @param {import('vue').Reactive<UseFormModelRawProps>} props - The reactive arguments.
 * @returns {UseFormModelState} The reactive state.
 */
export default function useFilterForm(props) {
    const modelInfoStore = storeModelInfo();
    const internalState = reactive({
        modelInfo: {},
        modelInfoChoices: {},
    });
    const state = shallowReactive(
        /** @type {UseFormModelRawState} */ {
            filterFields: ref([]),
            // components themselves should not be deep reactive, avoiding vue warnings
            fieldComponents: shallowRef({}),
            fieldProps: reactive({}),
            widgetComponents: shallowRef({}),
            widgetProps: reactive({}),
            internalState: toRef(internalState), // debug
        },
    );

    watch(
        [toRef(props, "app"), toRef(props, "model")],
        ([appName, model], [oldAppName, oldModel]) => {
            if (appName && model && (appName !== oldAppName || model !== oldModel)) {
                modelInfoStore.fetchModelInfo(appName, model);
            }
        },
        { immediate: true },
    );
    const appModelKey = computed(() => getAppModelDotName({ app: props.app, model: props.model }));

    watch(
        () => modelInfoStore.modelInfos[appModelKey.value],
        (modelInfo) => {
            if (!isEqual(internalState.modelInfo, modelInfo)) {
                assignReactiveObject(internalState.modelInfo, modelInfo || {});
            }
        },
        { immediate: true },
    );

    watch(
        () => modelInfoStore.fieldChoices[appModelKey.value],
        (fieldChoices) => {
            if (fieldChoices) {
                for (const field in fieldChoices) {
                    const choices = fieldChoices[field]?.results || [];
                    // Extend widgetProps with choices
                    state.widgetProps[field] = {
                        ...state.widgetProps[field],
                        options: choices,
                    };
                }
            }
        },
        { immediate: true, deep: true },
    );

    const assignStateObjectsIfChanged = (args) => {
        for (const key of UseFilterFormStateKeys) {
            if (!isEqual(state[key], args[key])) {
                assignReactiveObject(state[key], args[key]);
            }
        }
    };

    watch(
        [toRef(internalState, "modelInfo"), toRef(props, "filterFields")],
        ([modelInfo, filterFields]) => {
            if (modelInfo?.filtering?.length) {
                const fieldComponents = {};
                const fieldProps = {};
                const widgetComponents = {};
                const widgetProps = {};
                for (const filter of modelInfo.filtering) {
                    const lookupExpressions = [];
                    for (const expression of filterExpressions) {
                        // todo: the data on the server will be getting refactored, hopefully for less indirection
                        if (
                            filter.filters.some((container) => {
                                return container.lookupExprs.includes(expression.value);
                            })
                        ) {
                            lookupExpressions.push(expression);
                        }
                    }
                    for (const expression of lookupExpressions) {
                        const key = `${filter.name}__${expression.value}`;
                        const [fieldComponentName, fieldComponent] = getFieldComponent(filter, expression);
                        fieldComponents[key] = fieldComponent;
                        fieldProps[key] = getFieldProps(fieldComponentName, filter, expression);
                        const [widgetComponentName, widgetComponent] = getWidgetComponent(
                            fieldComponentName,
                            filter,
                            expression,
                        );
                        widgetComponents[key] = widgetComponent;
                        // todo: we should have a way to register custom widget props
                        //  or provide them to the form model as props
                        widgetProps[key] = getWidgetProps(
                            fieldComponentName,
                            widgetComponentName,
                            widgetComponent,
                            filter,
                            expression,
                        );
                    }
                    if (filter.choices) {
                        modelInfoStore.fetchFieldChoices(props.app, props.model, filter.name);
                    }
                }
                assignStateObjectsIfChanged({
                    fieldComponents,
                    fieldProps,
                    widgetComponents,
                    widgetProps,
                });
                const filterFieldsToShow = modelInfo.filtering
                    .filter(identity)
                    .filter((f) => (filterFields || []).includes(f.name));
                const mappedFilterFields = filterFieldsToShow.map((f) => ({
                    ...f,
                    label: memoizedStartCase(f.name),
                    labelVerbose: `${memoizedStartCase(f.name)} (${memoizedStartCase(f.type)})`,
                }));
                assignReactiveObject(state.filterFields, mappedFilterFields);
            } else {
                assignStateObjectsIfChanged({
                    fieldComponents: {},
                    fieldProps: {},
                    widgetComponents: {},
                    widgetProps: {},
                });
                assignReactiveObject(state.filterFields, []);
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(state);
}
