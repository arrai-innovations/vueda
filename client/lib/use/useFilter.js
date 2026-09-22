/**
 * @module use/useFilter
 * @description Builds and manages reactive filter form state, mapping model fields to their appropriate filter widgets and providing the filter context to child components.
 */
import { deepUnref } from "@arrai-innovations/reactive-helpers";
import { isRangeFilter } from "@vueda/use/useFilterForm.js";
import { buildForm, resolveComponent } from "@vueda/utils/buildForm.js";
import { FilterFieldMappings, filterFieldMapping } from "@vueda/utils/fieldMappings.js";
import { availableFields, availableWidgets } from "@vueda/utils/formLookups.js";
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
 * @typedef {object} FilterFieldEntry
 * @property {string} name - The form field name: the filter name, or `${filterName}.${suffix}` for a range boundary.
 * @property {import('@vueda/stores/storeModelInfo.js').FilterInfo|{isBoundary: true, typeFilter: string, required: false, label: string}} detail - The detail the field and widget components resolve from.
 * @property {boolean} needsWidget - Whether the entry mounts a widget of its own. The base field of a range does not: its two boundaries carry the inputs.
 * @property {string} [suffix] - The range suffix a boundary entry renders; absent on the filter's own entry.
 */

/**
 * The form fields one filter renders: the filter itself, plus one boundary field per suffix
 * when it is a range. Shared by the component resolution below and by
 * {@link getMissingFilterInputSupport}, so what is checked is what gets mounted.
 *
 * @param {string} filterName - The filter field name.
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo} filterDetails - The filter configuration.
 * @returns {FilterFieldEntry[]}
 */
export function filterFieldEntries(filterName, filterDetails) {
    const isRange = isRangeFilter(filterDetails);
    const entries = [{ name: filterName, detail: filterDetails, needsWidget: !isRange }];
    if (isRange) {
        for (const suffix of filterDetails.suffixes) {
            entries.push({
                name: `${filterName}.${suffix}`,
                detail: {
                    isBoundary: true,
                    typeFilter: filterDetails.typeFilter,
                    required: false,
                    label: capitalize(suffix),
                },
                needsWidget: true,
                suffix,
            });
        }
    }
    return entries;
}

/**
 * Per-field component overrides consulted before the filter type's default mapping, in the
 * shape `storeModelConfig` holds them for a view. A range boundary is keyed
 * `${filterName}.${suffix}`.
 *
 * @typedef {object} FilterInputOverrides
 * @property {{[name: string]: import('@vueda/utils/formLookups.js').FieldComponent|string|(() => import('vue').Component)}} [fieldComponents] - Field component overrides by field name.
 * @property {{[name: string]: import('@vueda/utils/formLookups.js').WidgetComponent|string|(() => import('vue').Component)}} [widgetComponents] - Widget component overrides by field name.
 */

/**
 * What the client lacks to render an editable input for a filter. An empty result means the
 * filter type has value handling and every form field the filter mounts resolves a component,
 * through the same resolution `buildForm` applies when the field renders: a per-field override
 * first, then the type's default mapping. Nothing is inferred from the field or type name.
 *
 * @param {string} filterName - The filter field name.
 * @param {import('@vueda/stores/storeModelInfo.js').FilterInfo} filterDetails - The filter configuration.
 * @param {FilterInputOverrides} [overrides] - Per-field component overrides from the view config.
 * @returns {string[]} Descriptions of each missing piece; empty when the input can render.
 */
export function getMissingFilterInputSupport(filterName, filterDetails, overrides = {}) {
    const typeFilter = filterDetails?.typeFilter;
    if (!typeFilter) {
        return ["a filter type"];
    }
    const missing = [];
    if (!FilterFieldMappings[typeFilter]) {
        missing.push(`value handling for filter type "${typeFilter}"`);
    }
    const resolves = (candidate, lookup, kind, name) => {
        try {
            resolveComponent(candidate, lookup, { kind, fieldName: name });
            return true;
        } catch {
            return false;
        }
    };
    for (const { name, detail, needsWidget, suffix } of filterFieldEntries(filterName, filterDetails)) {
        const target = suffix
            ? `the "${suffix}" boundary of filter type "${typeFilter}"`
            : `filter type "${typeFilter}"`;
        const field = overrides.fieldComponents?.[name] || getFieldComponent(detail);
        if (!resolves(field, availableFields, "field", name)) {
            missing.push(`a field component for ${target}`);
        }
        const widget = overrides.widgetComponents?.[name] || getWidgetComponent(detail);
        if (needsWidget && !resolves(widget, availableWidgets, "widget", name)) {
            missing.push(`a widget for ${target}`);
        }
    }
    return missing;
}

/**
 * @typedef {object} UseFilterStateRawState
 * @property {string} app - The app name to load form configuration for
 * @property {string} model - The model name to load form configuration for
 * @property {string|undefined} view - The view name if wanting to use view specific configuration.
 * @property {string[]} filterables - The resolved filterable field names, as given by the caller.
 * @property {{[filterName:string]:import('@vueda/stores/storeModelInfo.js').FilterInfo}} filterableDetails - The resolved per-field filter details, as given by the caller; looked up by field name via `FilterModelSymbol`-injecting descendants (e.g. `FieldRenderer`).
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
 * @property {string[]} filterables - Already-resolved filterable field names (e.g. from `useViewList`'s `filter.filterables`). Used as-is; this composable does not compute or merge them itself.
 * @property {{[filterName:string]:import('@vueda/stores/storeModelInfo.js').FilterInfo}} filterableDetails - Already-resolved per-field filter details (e.g. from `useViewList`'s `filter.filterableDetails`).
 */

/**
 * Resolves each filterable field's form component and widget from the already-resolved
 * `filterables`/`filterableDetails` given via props, and provides the resulting state as
 * the `FilterModelSymbol` context for descendant components (e.g. `FilterFieldForm`,
 * `FilterChip`). Does not fetch, merge, or hold its own copy of the filterable field list
 * or details — see {@link useFilterables} for that.
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
            // Plain pass-through refs, not a computed merge: FilterModelSymbol injectors
            // (e.g. FilterForm, via useFieldRenderer) look up a field's detail by name from
            // this shared context, so it must still expose the props it was given as-is.
            filterables: toRef(props, "filterables"),
            filterableDetails: toRef(props, "filterableDetails"),
            fieldComponents: shallowReactive({}),
            fieldProps: {},
            widgetComponents: shallowReactive({}),
            widgetProps: {},
        },
    );

    const {
        assignStateObjectsIfChanged,
        setFieldComponent,
        setFieldComponentProps,
        setWidgetComponent,
        setWidgetComponentProps,
    } = buildForm(props, state, getFieldComponent, getFieldProps, getWidgetComponent, getWidgetProps);

    // `filterables`/`filterableDetails` are owned and computed entirely by the caller; this
    // composable only resolves field/widget components from them, and never merges or holds
    // its own copy of the filterable field list or details.
    watch(
        [toRef(state, "filterables"), toRef(state, "filterableDetails")],
        ([filterables, filterableDetails]) => {
            if (Object.keys(filterableDetails || {}).length && filterables?.length) {
                const fieldComponents = {};
                const fieldProps = {};
                const widgetComponents = {};
                const widgetProps = {};
                const entries = [];
                const missingDetails = [];
                const unknownTypeFilters = [];

                for (const fieldName of deepUnref(filterables) || []) {
                    const detail = filterableDetails[fieldName];
                    if (!detail) {
                        missingDetails.push(fieldName);
                        continue;
                    }
                    if (!detail.typeFilter) {
                        unknownTypeFilters.push(fieldName);
                        continue;
                    }
                    entries.push(...filterFieldEntries(fieldName, detail));
                }

                // Log any issues found during processing
                if (missingDetails.length > 0) {
                    console.warn(`Missing filter details for fields in ${props.app}.${props.model}:`, missingDetails);
                }
                if (unknownTypeFilters.length > 0) {
                    console.warn(
                        `Unknown typeFilter for filterable fields in ${props.app}.${props.model}:`,
                        unknownTypeFilters,
                    );
                }

                for (const { name, detail, needsWidget } of entries) {
                    fieldComponents[name] = setFieldComponent(name, detail);
                    fieldProps[name] = setFieldComponentProps(name, detail);
                    if (needsWidget) {
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
