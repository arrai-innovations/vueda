import { assignReactiveObject } from "@arrai-innovations/reactive-helpers";
import { useModelConfig } from "@vueda/use/useModelConfig.js";
import { availableFields, availableWidgets } from "@vueda/utils/formLookups.js";
import isEqual from "lodash-es/isEqual.js";
import isSet from "lodash-es/isSet.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, toRef, watch } from "vue";
import { deepUnref } from "vue-deepunref";

/*
 * @param {string} fieldName - The name of the field.
 * @returns {string[]} The slot names for the field's help, error, and message slots.
 */
export const getFormChoresSlotNames = (fieldName) => {
    return [
        "field-help",
        "field-error",
        "field-message",
        `field(${fieldName})help`,
        `field(${fieldName})error`,
        `field(${fieldName})message`,
    ];
};

export function buildForm(props, state, getFieldComponent, getFieldProps, getWidgetComponent, getWidgetProps) {
    const modelConfig = useModelConfig(toRef(props, "app"), toRef(props, "model"), toRef(props, "view"));
    const es = effectScope();
    let computedFields = [];

    const assignStateObjectsIfChanged = (args) => {
        for (const key in args) {
            if (!isEqual(state[key], args[key])) {
                if (isSet(args[key])) {
                    state[key] = new Set(args[key]);
                } else {
                    assignReactiveObject(state[key], args[key]);
                }
            }
        }
    };

    watch(
        toRef(state, "computedFields"),
        () => {
            computedFields = deepUnref(state.computedFields) || [];
        },
        { immediate: true, deep: true },
    );

    function setUpWatch(
        configKey,
        configDetailKey = undefined,
        propKey = configKey,
        propDetailKey = configDetailKey,
        stateKey = propKey,
        stateDetailKey = propDetailKey,
    ) {
        watch(
            [
                () => modelConfig.config[configKey],
                () => configDetailKey ?? modelConfig.config[configDetailKey],
                toRef(props, propKey),
                toRef(props, propDetailKey),
            ],
            () => {
                // props has priority over config
                const desired = props[propKey] || modelConfig.config?.[configKey] || [];
                // details fields merge at the field property level
                const desiredDetails = {};
                if (configDetailKey) {
                    for (const d of desired) {
                        desiredDetails[d] = {
                            ...modelConfig.config?.[configDetailKey]?.[d],
                            ...props[propDetailKey]?.[d],
                        };
                    }
                    assignStateObjectsIfChanged({
                        [stateKey]: desired,
                        [stateDetailKey]: desiredDetails,
                    });
                } else {
                    assignStateObjectsIfChanged({
                        [stateKey]: desired,
                    });
                }
            },
            { immediate: true, deep: true },
        );
    }

    function setComponent(key, detailObject, baseExpanded = false, fieldName = key) {
        let component = undefined;
        es.run(() => {
            component = computed(() => {
                if (computedFields.includes(fieldName)) {
                    return availableFields.FieldString;
                }
                const component =
                    props.fieldComponents?.[fieldName] ||
                    modelConfig?.config?.fieldComponents?.[fieldName] ||
                    (baseExpanded ? availableFields.FieldSetStackedInline : getFieldComponent(detailObject));
                if (typeof component === "string") {
                    // let props and modelConfig not pass actual components
                    return availableFields[component];
                }
                return component;
            });
        });
        return component;
    }
    function setComponentProps(key, detailObject, fieldName = key) {
        let componentProps = undefined;
        es.run(() => {
            componentProps = computed(() => {
                return {
                    // useFormModel resolves type, the fields don't care about the server type.
                    ...omit(detailObject, ["type"]),
                    ...(getFieldProps(detailObject) || {}),
                    ...(deepUnref(modelConfig.config?.fieldProps?.[fieldName]) || {}),
                    ...(deepUnref(props.fieldProps?.[fieldName]) || {}),
                    name: key,
                };
            });
        });
        return componentProps;
    }
    function setWidget(key, detailObject, baseExpanded = false, fieldName = key) {
        let widget = undefined;
        es.run(() => {
            widget = computed(() => {
                if (computedFields.includes(fieldName)) {
                    return availableWidgets.WidgetTextarea;
                }
                if (baseExpanded) {
                    return null;
                }
                const component =
                    props.widgetComponents?.[fieldName] ||
                    modelConfig?.config?.widgetComponents?.[fieldName] ||
                    getWidgetComponent(detailObject);

                if (typeof component === "string") {
                    // Allow props and modelConfig to pass component names
                    return availableWidgets[component];
                }
                return component;
            });
        });

        return widget;
    }

    function setWidgetProps(
        key,
        detailObject,
        baseExpanded = false,
        isExpandedField = false,
        field = {},
        fieldName = key,
    ) {
        let widget = undefined;
        es.run(() => {
            widget = computed(() => {
                if (baseExpanded) {
                    return {};
                }
                const baseProps = {
                    ...(getWidgetProps(detailObject) || {}),
                    ...(deepUnref(modelConfig.config?.widgetProps?.[fieldName]) || {}),
                    ...(deepUnref(props.widgetProps?.[fieldName]) || {}),
                };
                if (detailObject.choices === true) {
                    if (isExpandedField) {
                        const { expandDetail, expandFieldName } = field;
                        baseProps.fieldApp = expandDetail.app_label;
                        baseProps.fieldModel = expandDetail.model;
                        baseProps.app = detailObject.appLabel;
                        baseProps.model = detailObject.model;
                        baseProps.fieldName = expandFieldName;
                    } else {
                        baseProps.fieldApp = props.app;
                        baseProps.fieldModel = props.model;
                        baseProps.app = detailObject.appLabel;
                        baseProps.model = detailObject.model;
                        baseProps.fieldName = fieldName;
                    }
                } else {
                    baseProps.options = detailObject.choices;
                }
                return baseProps;
            });
        });
        return widget;
    }
    return { setUpWatch, assignStateObjectsIfChanged, setComponent, setComponentProps, setWidget, setWidgetProps };
}
