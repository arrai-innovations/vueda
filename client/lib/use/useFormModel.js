import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import FieldBoolean from "@vueda/fields/FieldBoolean.vue";
import FieldDate from "@vueda/fields/FieldDate.vue";
import FieldNumber from "@vueda/fields/FieldNumber.vue";
import FieldObject from "@vueda/fields/FieldObject.vue";
import FieldString from "@vueda/fields/FieldString.vue";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { memoizedSnakeCase } from "@vueda/utils/memoized.js";
import WidgetCheckbox from "@vueda/widgets/WidgetCheckbox.vue";
import WidgetInput from "@vueda/widgets/WidgetInput.vue";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";
import WidgetSelect from "@vueda/widgets/WidgetSelect.vue";
import WidgetTextarea from "@vueda/widgets/WidgetTextarea.vue";
import identity from "lodash-es/identity.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, reactive, readonly, ref, shallowReactive, shallowRef, toRef, watch } from "vue";

// todo: we should have a way to register custom field components
const builtInTypes = {
    TextField: FieldString,
    CharField: FieldString,
    BooleanField: FieldBoolean,
    DateField: FieldDate,
    DateTimeField: FieldDate,
    DecimalField: FieldNumber,
    FloatField: FieldNumber,
    IntegerField: FieldNumber,
    PositiveIntegerField: FieldNumber,
    PositiveSmallIntegerField: FieldNumber,
    SmallIntegerField: FieldNumber,
    TimeField: FieldDate,
    EmailField: FieldString,
    URLField: FieldString,
    UUIDField: FieldString,
    ForeignKey: FieldString,
    ManyToManyField: FieldString,
    OneToOneField: FieldString,
    JSONField: FieldObject,
    ArrayField: FieldObject,
    BinaryField: FieldString,
    FilePathField: FieldString,
    IPAddressField: FieldString,
    GenericIPAddressField: FieldString,
    SlugField: FieldString,
    FileField: FieldString,
    ImageField: FieldString,
    AutoField: FieldString,
    BigAutoField: FieldString,
    BigIntegerField: FieldNumber,
    DurationField: FieldString,
    GenericRelation: FieldString,
    GenericForeignKey: FieldString,
    NullBooleanField: FieldBoolean,
    PositiveBigIntegerField: FieldNumber,
    PositiveDecimalField: FieldNumber,
};

// todo: we should have a way to register custom widgets
const defaultWidgets = {
    FieldBoolean: WidgetCheckbox,
    FieldDate: WidgetInput,
    FieldDateTime: WidgetInput,
    FieldNumber: WidgetInput,
    FieldObject: WidgetTextarea,
    FieldString: WidgetInput,
    FieldTime: WidgetInput,
};

const defaultFieldProps = {};

// todo: we should have a way to register custom widget props for custom fields
// modelconfig should have a view that client can pass in custom props
const defaultWidgetProps = {
    FieldBoolean: {},
    FieldDate: {
        type: "date",
    },
    FieldDateTime: {
        type: "datetime-local",
    },
    FieldNumber: {
        type: "number",
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
    return builtInTypes[type] || FieldString;
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
 * @property {{[fieldName:string]:import('@vueda/models/FieldModel').FieldModel}} fieldObjects -
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

const UseFormModelStateKeys = ["fieldObjects", "fieldComponents", "fieldProps", "widgetComponents", "widgetProps"];
/**
 * Using server model info and client model config, this hook provides the necessary reactive state for a form model.
 *
 * @param {import('vue').Reactive<UseFormModelRawProps>} props - The reactive arguments.
 * @returns {UseFormModelState} The reactive state.
 */
export function useFormModel(props) {
    const modelInfoStore = storeModelInfo();
    const internalState = reactive({
        modelInfo: {},
    });
    const state = shallowReactive(
        /** @type {UseFormModelRawState} */ {
            fields: ref([]),
            fieldObjects: reactive({}),
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
        [toRef(internalState, "modelInfo"), toRef(props, "fields")],
        ([modelInfo, fields]) => {
            if (modelInfo?.fields?.length && fields?.length) {
                const fieldObjects = {};
                const fieldComponents = {};
                const fieldProps = {};
                const widgetComponents = {};
                const widgetProps = {};
                for (const fieldObj of modelInfo.fields) {
                    if (!fields.includes(fieldObj.name)) {
                        continue;
                    }
                    // todo: we should have a way to have custom field props on top server model info
                    fieldObjects[fieldObj.name] = fieldObj;
                    const fieldComponent = djangoTypeToFieldComponent(fieldObj.type);
                    fieldComponents[fieldObj.name] = fieldComponent;
                    fieldProps[fieldObj.name] = getFieldProps(fieldObj);
                    widgetComponents[fieldObj.name] = getDefaultWidget(fieldObj);
                    // todo: we should have a way to register custom widget props
                    //  or provide them to the form model as props
                    widgetProps[fieldObj.name] = getWidgetProps(fieldComponent.__name, fieldObj);
                }
                assignStateObjectsIfChanged({
                    fieldObjects,
                    fieldComponents,
                    fieldProps,
                    widgetComponents,
                    widgetProps,
                });
                assignReactiveObject(state.fields, fields.map((field) => fieldObjects[field]?.name).filter(identity));
            } else {
                assignStateObjectsIfChanged({
                    fieldObjects: {},
                    fieldComponents: {},
                    fieldProps: {},
                    widgetComponents: {},
                    widgetProps: {},
                });
                assignReactiveObject(state.fields, []);
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(state);
}
