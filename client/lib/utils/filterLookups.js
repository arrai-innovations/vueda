/**
 * The filter expressions available for filtering.
 * @typedef {object} FilterExpression
 * @property {string} label - The verbose name of the expression.
 * @property {string} value - The value of the expression.
 */
import { defineAsyncComponent } from "vue";

/** @type {FilterExpression[]} */
export const filterExpressions = [
    { label: "Exact", value: "exact" },
    { label: "Case-Insensitive Exact", value: "iexact" },
    { label: "Contains", value: "contains" },
    { label: "Case-Insensitive Contains", value: "icontains" },
    { label: "Greater Than", value: "gt" },
    { label: "Greater Than or Equal", value: "gte" },
    { label: "Less Than", value: "lt" },
    { label: "Less Than or Equal", value: "lte" },
    { label: "In", value: "in" },
    { label: "Starts With", value: "startswith" },
    { label: "Case-Insensitive Starts With", value: "istartswith" },
    { label: "Ends With", value: "endswith" },
    { label: "Case-Insensitive Ends With", value: "iendswith" },
    { label: "Between", value: "range" },
    { label: "Is Null", value: "isnull" },
    { label: "Regex", value: "regex" },
    { label: "Case-Insensitive Regex", value: "iregex" },
    { label: "Year", value: "year" },
    { label: "Month", value: "month" },
    { label: "Day", value: "day" },
    { label: "Week", value: "week" },
    { label: "Week Day", value: "week_day" },
    { label: "Quarter", value: "quarter" },
    { label: "Time", value: "time" },
    { label: "Hour", value: "hour" },
    { label: "Minute", value: "minute" },
    { label: "Second", value: "second" },
    { label: "Date", value: "date" },
    { label: "Day of Week", value: "day_of_week" },
];
/**
 * Defines the component name and function to use.
 *
 * @typedef {()=>Promise<import('vue').Component>} FieldComponent
 */
/** @type {{[fieldComponentName:string]: FieldComponent}} */
export const availableFields = {
    FieldArray: defineAsyncComponent(async () => (await import("@vueda/fields/FieldArray.vue")).default),
    FieldBoolean: defineAsyncComponent(async () => (await import("@vueda/fields/FieldBoolean.vue")).default),
    FieldDate: defineAsyncComponent(async () => (await import("@vueda/fields/FieldDate.vue")).default),
    FieldDateTime: defineAsyncComponent(async () => (await import("@vueda/fields/FieldDateTime.vue")).default),
    FieldDuration: defineAsyncComponent(async () => (await import("@vueda/fields/FieldDuration.vue")).default),
    FieldInline: defineAsyncComponent(async () => (await import("@vueda/fields/FieldInline.vue")).default),
    FieldNumber: defineAsyncComponent(async () => (await import("@vueda/fields/FieldNumber.vue")).default),
    FieldObject: defineAsyncComponent(async () => (await import("@vueda/fields/FieldObject.vue")).default),
    FieldRange: defineAsyncComponent(async () => (await import("@vueda/fields/FieldRange.vue")).default),
    FieldString: defineAsyncComponent(async () => (await import("@vueda/fields/FieldString.vue")).default),
    FieldTime: defineAsyncComponent(async () => (await import("@vueda/fields/FieldTime.vue")).default),
};

/**
 * @typedef {()=>Promise<import('vue').Component>} WidgetComponent
 */

/** @type {{[widgetComponentName:string]: WidgetComponent}} */
export const availableWidgets = {
    WidgetAutoComplete: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetAutoComplete.vue")).default,
    ),
    WidgetCheckbox: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetCheckbox.vue")).default),
    WidgetDatePicker: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetDatePicker.vue")).default),
    WidgetHtml: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetHtml.vue")).default),
    WidgetInput: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetInput.vue")).default),
    WidgetMultiSelect: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetMultiSelect.vue")).default),
    WidgetModel: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetModel.vue")).default),
    WidgetRadio: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetRadio.vue")).default),
    WidgetReadOnly: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetReadOnly.vue")).default),
    WidgetSelect: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetSelect.vue")).default),
    WidgetSlider: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetSlider.vue")).default),
    WidgetTextarea: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetTextarea.vue")).default),
};
