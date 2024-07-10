import FieldBoolean from "../fields/FieldBoolean.vue";
import FieldNumber from "../fields/FieldNumber.vue";
import FieldString from "../fields/FieldString.vue";
import { FieldDateRange } from "../index.js";
import { storeModelInfo } from "../stores/storeModelInfo.js";
import { memoizedSnakeCase } from "../utils/memoized.js";
import WidgetDatePicker from "../widgets/WidgetDatePicker.vue";
import WidgetInput from "../widgets/WidgetInput.vue";
import WidgetReadOnly from "../widgets/WidgetReadOnly.vue";
import WidgetSelect from "../widgets/WidgetSelect.vue";
import WidgetTextarea from "../widgets/WidgetTextarea.vue";
import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import identity from "lodash-es/identity.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, reactive, readonly, ref, shallowReactive, shallowRef, toRef, watch } from "vue";

const filterTypes = {
    alpha: FieldString,
    numeric: FieldNumber,
    boolean: FieldBoolean,
    date: FieldDateRange,
    datetime: FieldDateRange,
};

const defaultWidgets = {
    FieldBoolean: WidgetSelect,
    FieldDateRange: WidgetDatePicker,
    FieldDateTime: WidgetDatePicker,
    FieldNumber: WidgetInput,
    FieldString: WidgetSelect,
    FieldTime: WidgetInput,
};

const defaultFieldProps = {};

// todo: we should have a way to register custom widget props for custom fields
// modelconfig should have a view that client can pass in custom props
const defaultWidgetProps = {
    FieldBoolean: {
        options: [
            {
                label: "True",
                value: true,
            },
            {
                label: "False",
                value: false,
            },
        ],
    },
    FieldDateRange: {
        selectionMode: "range",
    },
    FieldDateTime: {
        selectionMode: "range",
        showTime: "true",
    },
    FieldObject: {},
    FieldString: {
        options: [
            {
                label: "office",
                value: "office",
            },
        ],
    },
    FieldTime: {
        type: "time",
    },
};

/**
 * Get the field props for a given field object.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} fieldObj - The field object.
 * @returns {{[key:string]: any}} The field props.
 */
const getFieldProps = (fieldObj) => {
    const defaultProps = defaultFieldProps[fieldObj.type] || {};
    return {
        // useFormModel resolves type, the fields don't care about the server type.
        ...omit(fieldObj, ["type"]),
        ...defaultProps,
    };
};

/**
 * Get the widget props for a given field type and field object.
 *
 * @param {string} fieldType - The field type.
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} fieldObj - The field object.
 * @returns {{[key:string]: any}} The widget props.
 */
const getWidgetProps = (fieldType, fieldObj) => {
    const defaultProps = defaultWidgetProps[fieldType] || {};
    if (fieldObj.type === "ChoiceField") {
        const choices = fieldObj.choices;
        return {
            ...defaultProps,
            options: Object.keys(choices).map((key) => ({
                label: choices[key],
                value: key,
            })),
        };
    }
    return defaultProps;
};

/**
 * Get the field component for a given Django field type.
 *
 * @param {string} type - The Django field type.
 * @returns {import('vue').Component} The field component.
 */
const djangoTypeToFieldComponent = (type) => {
    // todo: we should have a way to register custom field components
    return filterTypes[type] || FieldString;
};
/**
 * Get the default widget for a given field object.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - The field object.
 * @returns {import('vue').Component} The widget component.
 */
const getDefaultWidget = (field) => {
    if (field.readOnly) {
        return WidgetReadOnly;
    }
    if (field.choices) {
        return WidgetSelect;
    }
    if (field.type === "TextField" || field.many) {
        return WidgetTextarea;
    }
    const fieldComponent = djangoTypeToFieldComponent(field.type);
    // todo: it would be nice to have a way to just specify a widget, in addition to having to pass as a slot
    return defaultWidgets[fieldComponent.__name] || WidgetInput;
};

/**
 * @typedef {object} UseFormModelRawState
 * @property {{[fieldName:string]:import('vue').Component}} fieldComponents -
 * @property {{[fieldName:string]: {[key:string]: any}}} fieldProps -
 * @property {{[fieldName:string]: import('vue').Component}} widgetComponents - The widget components
 * @property {{[fieldName:string]: {[key:string]: any}}} widgetProps -
 */

/**
 * @typedef {import('vue').shallowReactive<UseFormModelRawState>} UseFormModelState
 */

/**
 * @typedef {object} UseFormModelRawProps
 * @property {string} app - The app name
 * @property {string} model - The model name
 * @property {string[]} fields - The fields to display
 */

const UseFormModelStateKeys = ["fieldComponents", "fieldProps", "widgetComponents", "widgetProps"];
/**
 * Using server model info and client model config, this hook provides the necessary reactive state for a form model.
 *
 * @param {import('vue').Reactive<UseFormModelRawProps>} props - The reactive arguments.
 * @returns {UseFormModelState} The reactive state.
 */
export default function useFilterFormModel(props) {
    const modelInfoStore = storeModelInfo();
    const internalState = reactive({
        modelInfo: {},
    });
    const state = shallowReactive(
        /** @type {UseFormModelRawState} */ {
            filterFields: ref([]),
            // components themselves should not be deep reactive, avoiding vue warnings
            fieldComponents: shallowRef({}),
            fieldProps: reactive({}),
            widgetComponents: shallowRef({}),
            widgetProps: reactive({}),
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
    const appModelKey = computed(() => `${memoizedSnakeCase(props.app)}.${memoizedSnakeCase(props.model)}`);

    watch(
        () => modelInfoStore.modelInfos[appModelKey.value],
        (modelInfo) => {
            if (!isEqual(internalState.modelInfo, modelInfo)) {
                assignReactiveObject(internalState.modelInfo, modelInfo || {});
            }
        },
        { immediate: true },
    );

    const assignStateObjectsIfChanged = (args) => {
        for (const key of UseFormModelStateKeys) {
            if (!isEqual(state[key], args[key])) {
                assignReactiveObject(state[key], args[key]);
            }
        }
    };

    // todo: what about figuring out fields through foreign keys?
    watch(
        [toRef(internalState, "modelInfo"), toRef(props, "listFields")],
        ([modelInfo, listFields]) => {
            if (modelInfo?.filtering?.length) {
                const fieldComponents = {};
                const fieldProps = {};
                const widgetComponents = {};
                const widgetProps = {};
                console.log(listFields);
                for (const filter of modelInfo.filtering) {
                    // if (!listFields.includes(filter.name)) {
                    //     continue;
                    // }
                    const fieldComponent = djangoTypeToFieldComponent(filter.type);
                    fieldComponents[filter.name] = fieldComponent;
                    fieldProps[filter.name] = getFieldProps(filter);
                    widgetComponents[filter.name] = getDefaultWidget(filter);
                    // todo: we should have a way to register custom widget props
                    //  or provide them to the form model as props
                    widgetProps[filter.name] = getWidgetProps(fieldComponent.__name, filter);
                }
                assignStateObjectsIfChanged({
                    fieldComponents,
                    fieldProps,
                    widgetComponents,
                    widgetProps,
                });
                assignReactiveObject(state.filterFields, modelInfo.filtering.filter(identity));
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
