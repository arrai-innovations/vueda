import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import FieldBoolean from "@vueda/fields/FieldBoolean.vue";
import FieldRange from "@vueda/fields/FieldRange.vue";
import FieldString from "@vueda/fields/FieldString.vue";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import WidgetDatePicker from "@vueda/widgets/WidgetDatePicker.vue";
import WidgetInput from "@vueda/widgets/WidgetInput.vue";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";
import WidgetSelect from "@vueda/widgets/WidgetSelect.vue";
import WidgetSlider from "@vueda/widgets/WidgetSlider.vue";
import identity from "lodash-es/identity.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, reactive, readonly, ref, shallowReactive, shallowRef, toRef, watch } from "vue";

const filterTypes = {
    alpha: FieldString,
    numeric: FieldRange,
    boolean: FieldBoolean,
    date: FieldRange,
    datetime: FieldRange,
};

const defaultWidgets = {
    FieldBoolean: WidgetSelect,
    FieldRange: WidgetDatePicker,
    FieldDateTime: WidgetDatePicker,
    FieldNumber: WidgetInput,
    FieldString: WidgetSelect,
    FieldTime: WidgetInput,
};

const defaultFieldProps = {
    FieldRange: {
        rangeSuffix: ["after", "before"],
    },
};

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
    FieldRange: {
        selectionMode: "range",
    },
    FieldDateTime: {
        selectionMode: "range",
        showTime: "true",
    },
    FieldObject: {},
    FieldString: {},
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
const getFieldProps = (fieldType, fieldObj) => {
    // TODO: should grab the min and max from the server
    if (fieldObj.type === "numeric") {
        const numericProps = {
            rangeSuffix: ["min", "max"],
        };
        return {
            // useFormModel resolves type, the fields don't care about the server type.
            ...omit(fieldObj, ["type"]),
            ...numericProps,
        };
    }
    const defaultProps = defaultFieldProps[fieldType] || {};
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
const getWidgetProps = (fieldType) => {
    const defaultProps = defaultWidgetProps[fieldType] || {};
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
    if (field.type === "numeric") {
        return WidgetSlider;
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
            console.log("listFields: ", listFields);
            if (modelInfo?.filtering?.length) {
                const fieldComponents = {};
                const fieldProps = {};
                const widgetComponents = {};
                const widgetProps = {};
                for (const filter of modelInfo.filtering) {
                    const fieldComponent = djangoTypeToFieldComponent(filter.type);
                    fieldComponents[filter.name] = fieldComponent;
                    fieldProps[filter.name] = getFieldProps(fieldComponent.__name, filter);
                    widgetComponents[filter.name] = getDefaultWidget(filter);
                    // todo: we should have a way to register custom widget props
                    //  or provide them to the form model as props
                    widgetProps[filter.name] = getWidgetProps(fieldComponent.__name);
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
