import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { storeModelInfo } from "@vueda/stores/storeModelInfo.js";
import { getAppModelDotName } from "@vueda/utils/crudSupport.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import { computedAsync } from "@vueuse/core";
import identity from "lodash-es/identity.js";
import isEqual from "lodash-es/isEqual.js";
import omit from "lodash-es/omit.js";
import {
    computed,
    effectScope,
    provide,
    reactive,
    readonly,
    ref,
    shallowReactive,
    shallowRef,
    toRef,
    watch,
} from "vue";
import { deepUnref } from "vue-deepunref";

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
    TimeField: ["FieldTime", async () => (await import("@vueda/fields/FieldTime.vue")).default],
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
    DurationSecondsField: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    GenericRelation: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    GenericForeignKey: ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default],
    NullBooleanField: ["FieldBoolean", async () => (await import("@vueda/fields/FieldBoolean.vue")).default],
    PositiveBigIntegerField: ["FieldNumber", async () => (await import("@vueda/fields/FieldNumber.vue")).default],
    PositiveDecimalField: ["FieldNumber", async () => (await import("@vueda/fields/FieldNumber.vue")).default],
    ManyRelatedField: ["FieldInline", async () => (await import("@vueda/fields/FieldInline.vue")).default],
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
const getFieldProps = (fieldName, fieldObj) => {
    const defaultProps = defaultFieldProps[fieldObj.type] || {};
    return {
        // useFormModel resolves type, the fields don't care about the server type.
        ...omit(fieldObj, ["type"]),
        ...defaultProps,
        name: fieldName,
    };
};

/**
 * Get the widget props for a given field type and field object.
 *
 * @param {string} fieldType - The field type.
 * @returns {{[key:string]: any}} The widget props.
 */
const getWidgetProps = (fieldType) => {
    return defaultWidgetProps[fieldType] || {};
};

/**
 * Get the field component for a given Django field type.
 *
 * @param {string} field - The Django field type.
 * @returns {[componentName:string, ()=>Promise<import('vue').Component>]} The field component.
 */
const djangoTypeToFieldComponent = (field) => {
    // todo: we should have a way to register custom field components
    if (field.type === "TextField" || field.many) {
        return ["FieldArray", async () => (await import("@vueda/fields/FieldArray.vue")).default];
    }
    return (
        builtInTypes[field.type] || ["FieldString", async () => (await import("@vueda/fields/FieldString.vue")).default]
    );
};
/**
 * Get the default widget for a given field object.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - The field object.
 * @returns {()=>Promise<import('vue').Component>} The widget component.
 */
const getDefaultWidget = (field) => {
    if (field.readOnly) {
        return async () => (await import("@vueda/widgets/WidgetReadOnly.vue")).default;
    }
    if (field.choices) {
        return async () => (await import("@vueda/widgets/WidgetAutoComplete.vue")).default;
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
    if (fieldComponent[0] === "FieldInline") {
        return undefined;
    }
    return defaultWidgets[fieldComponent[0]] || (async () => (await import("@vueda/widgets/WidgetInput.vue")).default);
};

/**
 * @typedef {object} UseFormModelRawState
 * @property {{[fieldName:string]:import('@vueda/models/FieldModel').FieldModel}} fieldObjects -
 * @property {{[fieldName:string]:import('@vueda/models/FieldModel').FieldModel}} expandFieldObjects -
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
 * @property {{[fieldName:string]: [componentName:string, ()=>Promise<import('vue').Component>]}} fieldComponents - The field components
 * @property {{[fieldName:string]: {[key:string]: any}}} fieldProps - The field props
 * @property {{[fieldName:string]: ()=>Promise<import('vue').Component>}} widgetComponents - The widget components
 * @property {{[fieldName:string]: {[key:string]: any}}} widgetProps -
 */

const UseFormModelStateKeys = [
    "fieldObjects",
    "expandFieldObjects",
    "fieldComponents",
    "fieldProps",
    "widgetComponents",
    "widgetProps",
];
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
            expandFields: ref([]),
            fieldObjects: reactive({}),
            expandFieldObjects: reactive({}),
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
            assignReactiveObject(internalState.modelInfoChoices, fieldChoices || {});
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
    const setupWidgetComponent = (fieldName, fieldObj, props) => {
        const widgetComponent = props.widgetComponents[fieldName] || getDefaultWidget(fieldObj);
        return computedAsync(widgetComponent, null);
    };

    const setupWidgetProps = (fieldName, fieldObj, fieldComponent, props, internalState) => {
        return computed(() => {
            const baseProps = {
                ...(deepUnref(props.widgetProps[fieldName]) || {}),
                ...getWidgetProps(fieldComponent[0]),
            };
            if (fieldObj.choices) {
                baseProps.options = internalState.modelInfoChoices[fieldName]?.results || [];
            }
            return baseProps;
        });
    };

    const setupFieldComponent = (fieldName, fieldObj, props) => {
        const fieldComponent = props.fieldComponents[fieldName] || djangoTypeToFieldComponent(fieldObj);
        return computedAsync(fieldComponent[1], null);
    };

    const setupFieldProps = (fieldName, fieldObj, props) => {
        return computed(() => {
            return {
                ...(deepUnref(props.fieldProps[fieldName]) || {}),
                ...getFieldProps(fieldName, fieldObj),
            };
        });
    };

    // todo: what about figuring out fields through foreign keys?
    watch(
        [toRef(internalState, "modelInfo"), toRef(props, "fields")],
        ([modelInfo, fields]) => {
            if (Object.keys(modelInfo?.fields || {}).length && fields.length) {
                const fieldObjects = {};
                const expandFieldObjects = {};
                const fieldComponents = {};
                const fieldProps = {};
                const widgetComponents = {};
                const widgetProps = {};
                if (modelInfo?.expands) {
                    for (const expand of modelInfo.expands) {
                        if (!fields.includes(expand.name) || !expand.f) {
                            continue;
                        }
                        for (const [fieldKey, fieldObj] of Object.entries(expand.f)) {
                            if (fieldKey === "pk") {
                                continue;
                            }
                            const fieldName = `${expand.name}__${fieldKey}`;
                            if (fieldObj.choices) {
                                modelInfoStore.fetchFieldChoices(props.app, props.model, fieldName);
                            }
                            expandFieldObjects[fieldName] = { ...fieldObj, name: fieldName };
                            es.run(() => {
                                const fieldComponents1 = setupFieldComponent(fieldName, fieldObj, props);
                                const fieldProps1 = setupFieldProps(fieldName, fieldObj, props);
                                fieldComponents[fieldName] = fieldComponents1;
                                fieldProps[fieldName] = fieldProps1;
                                if (fieldComponents1[0] !== "FieldInline") {
                                    widgetComponents[fieldName] = setupWidgetComponent(fieldName, fieldObj, props);
                                    widgetProps[fieldName] = setupWidgetProps(
                                        fieldName,
                                        fieldObj,
                                        fieldComponents1,
                                        props,
                                        internalState,
                                    );
                                }
                            });
                        }
                    }
                }

                for (const [fieldName, fieldObj] of Object.entries(modelInfo.fields)) {
                    if (!fields.includes(fieldName)) {
                        continue;
                    }
                    if (fieldObj.choices) {
                        modelInfoStore.fetchFieldChoices(props.app, props.model, fieldName);
                    }
                    fieldObjects[fieldName] = { ...fieldObj, name: fieldName };
                    es.run(() => {
                        const fieldComponents1 = setupFieldComponent(fieldName, fieldObj, props);
                        const fieldProps1 = setupFieldProps(fieldName, fieldObj, props);
                        fieldComponents[fieldName] = fieldComponents1;
                        fieldProps[fieldName] = fieldProps1;
                        if (fieldComponents1[0] !== "FieldInline") {
                            widgetComponents[fieldName] = setupWidgetComponent(fieldName, fieldObj, props);
                            widgetProps[fieldName] = setupWidgetProps(
                                fieldName,
                                fieldObj,
                                fieldComponents1,
                                props,
                                internalState,
                            );
                        }
                    });
                }
                assignStateObjectsIfChanged({
                    fieldObjects,
                    expandFieldObjects,
                    fieldComponents,
                    fieldProps,
                    widgetComponents,
                    widgetProps,
                });
                assignReactiveObject(state.fields, fields.map((field) => fieldObjects[field]?.name).filter(identity));
                assignReactiveObject(state.expandFields, Object.keys(expandFieldObjects));
            } else {
                assignStateObjectsIfChanged({
                    fieldObjects: {},
                    expandFieldObjects: {},
                    fieldComponents: {},
                    fieldProps: {},
                    widgetComponents: {},
                    widgetProps: {},
                });
                assignReactiveObject(state.fields, []);
                assignReactiveObject(state.expandFields, []);
            }
        },
        { immediate: true, deep: true },
    );
    provide(FormModelSymbol, readonly(state));
    return readonly(state);
}
