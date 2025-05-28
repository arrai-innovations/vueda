import { deepUnref } from "@arrai-innovations/reactive-helpers";
import { buildForm } from "@vueda/utils/buildForm.js";
import { filterFieldMapping } from "@vueda/utils/fieldMappings.js";
import { FilterModelSymbol } from "@vueda/utils/symbols.js";
import capitalize from "lodash-es/capitalize.js";
import { provide, reactive, readonly, shallowReactive, toRef, watch } from "vue";

/**
 * Get the default widget for a given filter field object.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - Object that contains detail of a field
 * @returns {import('@vueda/utils/filterLookups.js').WidgetComponent} The widget component.
 */
const getFieldComponent = (field) => {
    return field.isBoundary
        ? filterFieldMapping[field.typeFilter]?.boundaryComponent
        : filterFieldMapping[field.typeFilter]?.component;
};
/**
 * Get the default widget for a given filter field object.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - Object that contains detail of a field
 * @returns {import('@vueda/utils/filterLookups.js').WidgetComponent} The widget component.
 */
const getWidgetComponent = (field) => {
    return field.isBoundary
        ? filterFieldMapping[field.typeFilter]?.boundaryWidget
        : filterFieldMapping[field.typeFilter]?.widget;
};

/**
 * Get the default widget props for a given filter field object.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - Object that contains detail of a field
 * @returns {{[fieldName:string]: {[key:string]: any}}|undefined} widgetProps - The default widget props
 */
const getWidgetProps = (field) => {
    return field.isBoundary
        ? filterFieldMapping[field.typeFilter]?.boundaryWidgetProps
        : filterFieldMapping[field.typeFilter]?.widgetProps;
};

/**
 * Get the default field props for a given filter field object.
 *
 * @param {import('@vueda/stores/storeModelInfo.js').FieldInfo} field - Object that contains detail of a field
 * @returns {{[fieldName:string]: {[key:string]: any}}|undefined} fieldProps - The default field props
 */
const getFieldProps = (field) => {
    return field.isBoundary
        ? filterFieldMapping[field.typeFilter]?.boundaryFieldProps
        : filterFieldMapping[field.typeFilter]?.fieldProps;
};
/**
 * @typedef {object} UseFilterStateRawState
 * @property {string} app - The app name to load form configuration for
 * @property {string} model - The model name to load form configuration for
 * @property {string|undefined} view - The view name if wanting to use view specific configuration.
 * @property {string[]} filterables - The filters to display, either passed in or from config.
 * @property {{[filterName:string]:import('@vueda/stores/storeModelInfo.js').FilterInfo}} filterableDetails - The merged filterableDetails, either passed in, from config or from server info.
 * @property {{[filterName:string]:import('vue').Component}} fieldComponents - The field components to use, either passed in or as a result of fieldObject.
 * @property {{[filterName:string]: {[key:string]: any, themeOverride: import('@vueda/use/useTheme.js').ThemeObject|undefined}}} fieldProps - The field props to use, either passed in or as a result of fieldObject.
 * @property {{[filterName:string]: import('vue').Component}} widgetComponents - The widget components to use, either passed in or as a result of fieldObject.
 * @property {{[filterName:string]: {[key:string]: any, themeOverride: import('@vueda/use/useTheme.js').ThemeObject|undefined}}} widgetProps - The widget props to use, either passed in or as a result of fieldObject.
 */

/**
 * @typedef {import('vue').DeepReadonly<import('vue').UnwrapNestedRefs<UseFilterStateRawState>>} UseFilterState
 */

/**
 * @typedef {object} UseFilterRawOverridableProps
 * @property {string[]|undefined} filterables - The filters to display, if different from the default
 * @property {{[filterName:string]: [componentName:string, ()=>Promise<import('vue').Component>]}|undefined} fieldComponents - The field components to use for the filter, if different from the default, by field path
 * @property {{[filterName:string]: {[key:string]: any}}|undefined} fieldProps - The field props to use for the filter, if different from the default, by field path
 * @property {{[filterName:string]: ()=>Promise<import('vue').Component>}|undefined} widgetComponents - The widget components to use for the filter, if different from the default, by field path
 * @property {{[filterName:string]: {[key:string]: any}}|undefined} widgetProps - The widget props to use for the filter, if different from the default, by field path
 */

/**
 * @typedef {UseFilterRawOverridableProps | import('@vueda/use/useTheme.js').ThemeRawProps} UseFilterRawProps
 * @property {string} app - The app name to load form configuration for
 * @property {string} model - The model name to load form configuration for
 * @property {string|undefined} view - The view name if wanting to use view specific configuration.
 * @property {{[filterName:string]:import('@vueda/stores/storeModelInfo.js').FilterInfo}|undefiend} filterableDetails - The filter details to use, if different from the default
 */

/**
 * This composable creates a reactive state for a filter form model, including the filterable fields and their details.
 *
 * @param {import('vue').Reactive<UseFilterRawProps>} props - The reactive arguments.
 * @returns {UseFilterState} The reactive state.
 */
export function useFilter(props) {
    const state = reactive(
        /** @type {UseFilterStateRawState} */ {
            app: toRef(props, "app"),
            model: toRef(props, "model"),
            view: toRef(props, "view"),
            filterables: [],
            filterableDetails: {},
            fieldComponents: shallowReactive({}),
            fieldProps: {},
            widgetComponents: shallowReactive({}),
            widgetProps: {},
        },
    );

    const {
        setUpWatch,
        assignStateObjectsIfChanged,
        setFieldComponent,
        setFieldComponentProps,
        setWidgetComponent,
        setWidgetComponentProps,
    } = buildForm(props, state, getFieldComponent, getFieldProps, getWidgetComponent, getWidgetProps);
    setUpWatch("filterables", "filterableDetails");

    watch(
        [toRef(state, "filterables"), toRef(state, "filterableDetails")],
        ([filterables, filterableDetails]) => {
            if (Object.keys(filterableDetails || {}).length && filterables.length) {
                const fieldComponents = {};
                const fieldProps = {};
                const widgetComponents = {};
                const widgetProps = {};
                let allFields = {};
                let rangeFields = [];
                for (const fieldName of deepUnref(filterables) || []) {
                    let detail = filterableDetails[fieldName];
                    if (!detail.typeFilter) {
                        throw new Error(
                            `Unknown filterable field ${fieldName} specified for ${props.app}.${props.model}`,
                        );
                    }
                    if (detail?.typeFilter.toLowerCase().includes("range") && detail.suffixes?.length === 2) {
                        for (const lookup of detail.suffixes) {
                            allFields[`${fieldName}__${lookup}`] = {
                                isBoundary: true,
                                typeFilter: detail.typeFilter,
                                required: false,
                                label: capitalize(lookup),
                            };
                        }
                        rangeFields.push(fieldName);
                    }
                    allFields[fieldName] = detail;
                }

                for (const [name, detail] of Object.entries(allFields)) {
                    fieldComponents[name] = setFieldComponent(name, detail);
                    fieldProps[name] = setFieldComponentProps(name, detail);
                    if (!rangeFields.includes(name)) {
                        widgetComponents[name] = setWidgetComponent(name, detail);
                        widgetProps[name] = setWidgetComponentProps(name, detail);
                    }
                }
                assignStateObjectsIfChanged({
                    fieldComponents,
                    fieldProps,
                    widgetComponents,
                    widgetProps,
                });
            } else {
                assignStateObjectsIfChanged({
                    fieldComponents: {},
                    fieldProps: {},
                    widgetComponents: {},
                    widgetProps: {},
                });
            }
        },
        { deep: true, immediate: true },
    );
    const returnObject = readonly(state);
    provide(FilterModelSymbol, returnObject);
    return returnObject;
}
