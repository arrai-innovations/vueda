/**
 * @module utils/filterLookups
 * @description Defines the list of Django ORM filter expressions available for building filter UIs.
 */

/**
 * The filter expressions available for filtering.
 * @typedef {object} FilterExpression
 * @property {string} label - The verbose name of the expression.
 * @property {string} value - The value of the expression.
 */

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
