import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import { computedAsync } from "@vueuse/core";
import identity from "lodash-es/identity.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, reactive, readonly, ref, shallowReactive, shallowRef, toRef, watch } from "vue";

// todo: we should have a way to register custom field components
const builtInTypes = {
    IntegerRangeField: ["FieldRange", async () => (await import("@vueda/fields/FieldRange.vue")).default],
    DateRangeField: ["FieldRange", async () => (await import("@vueda/fields/FieldRange.vue")).default],
    TextField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    CharField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    BooleanField: ["FieldBoolean", async () => (await import("@vueda/fields/FieldBoolean.vue")).default],
    DateField: ["FieldDate", async () => (await import("@vueda/fields/FieldDate.vue")).default],
    DateTimeField: ["FieldDate", async () => (await import("@vueda/fields/FieldDate.vue")).default],
    DecimalField: ["FieldNumber", async () => (await import("@vueda/fields/FieldNumber.vue")).default],
    FloatField: ["FieldNumber", async () => (await import("@vueda/fields/FieldNumber.vue")).default],
    IntegerField: ["FieldNumber", async () => (await import("@vueda/fields/FieldNumber.vue")).default],
    PositiveIntegerField: ["FieldNumber", async () => (await import("@vueda/fields/FieldNumber.vue")).default],
    PositiveSmallIntegerField: ["FieldNumber", async () => (await import("@vueda/fields/FieldNumber.vue")).default],
    SmallIntegerField: ["FieldNumber", async () => (await import("@vueda/fields/FieldNumber.vue")).default],
    TimeField: ["FieldDate", async () => (await import("@vueda/fields/FieldDate.vue")).default],
    EmailField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    URLField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    UUIDField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    ForeignKey: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    ManyToManyField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    OneToOneField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    JSONField: ["FieldObject", async () => (await import("@vueda/fields/FieldObject.vue")).default],
    ArrayField: ["FieldArray", async () => (await import("@vueda/fields/FieldArray.vue")).default],
    BinaryField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    FilePathField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    IPAddressField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    GenericIPAddressField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    SlugField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    FileField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    ImageField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    AutoField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    BigAutoField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    BigIntegerField: ["FieldNumber", async () => (await import("@vueda/fields/FieldNumber.vue")).default],
    DurationField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    GenericRelation: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    GenericForeignKey: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    NullBooleanField: ["FieldBoolean", async () => (await import("@vueda/fields/FieldBoolean.vue")).default],
    PositiveBigIntegerField: ["FieldNumber", async () => (await import("@vueda/fields/FieldNumber.vue")).default],
    PositiveDecimalField: ["FieldNumber", async () => (await import("@vueda/fields/FieldNumber.vue")).default],
};

// todo: we should have a way to register custom widgets
const defaultWidgets = {
    FieldBoolean: async () => (await import("@vueda/widgets/WidgetCheckbox.vue")).default,
    FieldDate: async () => (await import("@vueda/widgets/WidgetInput.vue")).default,
    FieldDateTime: async () => (await import("@vueda/widgets/WidgetInput.vue")).default,
    FieldNumber: async () => (await import("@vueda/widgets/WidgetInput.vue")).default,
    FieldArray: async () => (await import("@vueda/widgets/WidgetTextarea.vue")).default,
    FieldObject: async () => (await import("@vueda/widgets/WidgetTextarea.vue")).default,
    FieldString: async () => (await import("@vueda/widgets/WidgetInput.vue")).default,
    FieldTime: async () => (await import("@vueda/widgets/WidgetInput.vue")).default,
    FieldRange: async () => (await import("@vueda/widgets/WidgetDatePicker.vue")).default,
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
    FieldRange: {
        selectionMode: "range",
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
const djangoTypeToFieldComponent = (field) => {
    // todo: we should have a way to register custom field components
    if (field.type === "TextField" || field.many) {
        return async () => (await import("@vueda/fields/FieldArray.vue")).default;
    }
    return (
        builtInTypes[field.type] || ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default]
    );
};
/**
 * Get the default widget for a given field object.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - The field object.
 * @returns {import('vue').Component} The widget component.
 */
const getDefaultWidget = (field) => {
    if (field.readOnly) {
        return async () => (await import("@vueda/widgets/WidgetReadOnly.vue")).default;
    }
    if (field.choices) {
        return async () => (await import("@vueda/widgets/widgetAutoComplete.vue")).default;
        // return WidgetMultiSelect;
    }
    if (field.type === "TextField" || field.many) {
        return async () => (await import("@vueda/widgets/WidgetTextarea.vue")).default;
    }
    if (field.type === "IntegerRangeField") {
        return async () => (await import("@vueda/widgets/WidgetSlider.vue")).default;
    }
    const fieldComponent = djangoTypeToFieldComponent(field);
    // todo: it would be nice to have a way to just specify a widget, in addition to having to pass as a slot
    return defaultWidgets[fieldComponent[0]] || (async () => (await import("@vueda/widgets/WidgetInput.vue")).default);
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
 * @property {{[fieldName:string]: ()=>Promise<import('vue').Component>}} fieldComponents - The field components
 * @property {{[fieldName:string]: {[key:string]: any}}} fieldProps - The field props
 * @property {{[fieldName:string]: ()=>Promise<import('vue').Component>}} widgetComponents - The widget components
 * @property {{[fieldName:string]: {[key:string]: any}}} widgetProps -
 */

const UseFormModelStateKeys = ["fieldObjects", "fieldComponents", "fieldProps", "widgetComponents", "widgetProps"];
/**
 * Using server model info and client model config, this hook provides the necessary reactive state for a form model.
 *
 * @param {import('vue').Reactive<UseFormModelRawProps>} props - The reactive arguments.
 * @returns {UseFormModelState} The reactive state.
 */
export function useFormModel(props) {
    const es = effectScope();

    const modelInfoStore = storeModelInfo();
    const internalState = reactive({
        modelInfo: {},
        modelInfoChoices: {},
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
                    fieldObjects[fieldObj.name] = fieldObj;
                    // Note: props.fieldComponents = [name, async function to return the component]
                    const fieldComponent = props.fieldComponents[fieldObj.name] || djangoTypeToFieldComponent(fieldObj);
                    es.run(() => (fieldComponents[fieldObj.name] = computedAsync(fieldComponent[1], null)));
                    fieldProps[fieldObj.name] = props.fieldProps[fieldObj.name] || getFieldProps(fieldObj);
                    const widgetComponent = props.widgetComponents[fieldObj.name] || getDefaultWidget(fieldObj);
                    es.run(() => (widgetComponents[fieldObj.name] = computedAsync(widgetComponent, null)));
                    // todo: we should have a way to register custom widget props
                    //  or provide them to the form model as props
                    widgetProps[fieldObj.name] = props.widgetProps[fieldObj.name] || getWidgetProps(fieldComponent[0]);
                    if (fieldObj.choices) {
                        modelInfoStore.fetchFieldChoices(props.app, props.model, fieldObj.name);
                    }
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
