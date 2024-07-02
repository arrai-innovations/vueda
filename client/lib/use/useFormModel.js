import { assignReactiveObject, assignReactiveObjectDeep } from "@arrai-innovations/reactive-helpers";
import FieldBoolean from "@vueda/fields/FieldBoolean.vue";
import FieldDate from "@vueda/fields/FieldDate.vue";
import FieldNumber from "@vueda/fields/FieldNumber.vue";
import FieldObject from "@vueda/fields/FieldObject.vue";
import FieldString from "@vueda/fields/FieldString.vue";
import storeModelInfo from "@vueda/stores/storeModelInfo.js";
import { memoizedSnakeCase } from "@vueda/utils/memoized.js";
import WidgetCheckbox from "@vueda/widgets/WidgetCheckbox.vue";
import WidgetInput from "@vueda/widgets/WidgetInput.vue";
import WidgetSelect from "@vueda/widgets/WidgetSelect.vue";
import WidgetTextarea from "@vueda/widgets/WidgetTextarea.vue";
import isEqual from "lodash-es/isEqual.js";
import { computed, reactive, readonly, toRef, watch } from "vue";

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

const getWidgetProps = (fieldObj) => {
    const fieldComponent = djangoTypeToFieldComponent(fieldObj.type);
    const defaultProps = defaultWidgetProps[fieldComponent.__name];
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

const djangoTypeToFieldComponent = (type) => {
    // todo: we should have a way to register custom field components
    return builtInTypes[type] || FieldString;
};
const getDefaultWidget = (field) => {
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
 * @param {Object} props
 * @property {string} props.app - The app name
 * @property {string} props.model - The model name
 * @property {Array.<string>} props.fields - The names of the fields to display
 */
export default function useFormModel(props) {
    const modelInfoStore = storeModelInfo();
    const state = reactive({
        modelInfo: {},
        fields: [], //TODO: should be poped weith modelConfig
        fieldObjects: {},
        fieldComponents: {},
        widgetComponents: {},
        widgetProps: {},
    });

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
    // todo: what about figuring out fields through foreign keys?
    watch(
        [() => modelInfoStore.modelInfos[appModelKey.value], toRef(props, "fields")],
        ([modelInfo, fields]) => {
            if (modelInfo && fields) {
                if (!isEqual(state.modelInfo, modelInfo) || !isEqual(state.fields, fields)) {
                    assignReactiveObject(state.modelInfo, modelInfoStore.modelInfos[appModelKey.value]);
                    const fieldObjects = {};
                    const fieldComponents = {};
                    const widgetComponents = {};
                    const widgetProps = {};
                    const formFields = [];
                    for (const fieldObj of modelInfo.fields) {
                        if (!fields.includes(fieldObj.name)) {
                            continue;
                        }
                        // todo: we should have a way to have custom field props on top server model info
                        fieldObjects[fieldObj.name] = fieldObj;
                        fieldComponents[fieldObj.name] = djangoTypeToFieldComponent(fieldObj.type);
                        const widgetComponent = getDefaultWidget(fieldObj);
                        widgetComponents[fieldObj.name] = widgetComponent;
                        // todo: we should have a way to register custom widget props
                        //  or provide them to the form model as props
                        widgetProps[fieldObj.name] = getWidgetProps(fieldObj);
                        formFields.push(fieldObj.name);
                    }
                    assignReactiveObject(state.fields, formFields);
                    assignReactiveObject(state.fieldObjects, fieldObjects);
                    assignReactiveObject(state.fieldComponents, fieldComponents);
                    assignReactiveObject(state.widgetComponents, widgetComponents);
                    assignReactiveObjectDeep(state.widgetProps, widgetProps);
                }
            } else {
                assignReactiveObject(state.fields, []);
                assignReactiveObject(state.fieldObjects, {});
                assignReactiveObject(state.modelInfo, {});
                assignReactiveObject(state.fieldComponents, {});
                assignReactiveObject(state.widgetComponents, {});
                assignReactiveObject(state.widgetProps, {});
            }
        },
        { immediate: true, deep: true },
    );

    return readonly(state);
}
