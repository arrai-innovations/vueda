/**
 * @module utils/fieldMappings
 * @description Default mappings from DRF serializer field types to Vue field components and widget components.
 */
import { availableFields, availableWidgets } from "@vueda/utils/formLookups.js";
import merge from "lodash-es/merge.js";

/**
 * Describes how a DRF serializer field type maps to a Vue field component and widget.
 *
 * @typedef {object} FieldMappingEntry
 * @property {import('vue').Component|null} component - The field component, or null if none.
 * @property {import('vue').Component|null} widget - The widget component, or null if none.
 * @property {object} [fieldProps] - Extra props forwarded to the field component.
 * @property {object} [widgetProps] - Extra props forwarded to the widget component.
 * @property {import('vue').Component} [manyComponent] - Component for many-field wrappers.
 * @property {import('vue').Component} [manyWidget] - Widget for many-field wrappers.
 * @property {object} [manyWidgetProps] - Extra props for the many-field widget.
 * @property {import('vue').Component} [boundaryComponent] - Component for range field boundaries.
 * @property {import('vue').Component} [boundaryWidget] - Widget for range field boundaries.
 * @property {object} [boundaryWidgetProps] - Extra props for the range boundary widget.
 * @property {boolean} [default] - Whether this is the default mapping for its serializer field type.
 */

/** @type {{[fieldType: string]: {[componentVariant: string]: FieldMappingEntry}}} */
export const defaultFieldMappings = {
    BooleanField: {
        BooleanField: {
            component: availableFields.FormField,
            widget: availableWidgets.WidgetToggle,
            fieldProps: { ownsLayout: true },
            default: true,
        },
    },
    CharField: {
        CharField: {
            component: availableFields.FormField,
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { validation: "text", ownsLayout: true },
            default: true,
        },
        TextField: {
            component: availableFields.FormField,
            widget: availableWidgets.WidgetTextTextarea,
            fieldProps: { validation: "text", ownsLayout: true },
        },
    },
    DateField: {
        DateField: { component: availableFields.FieldDate, widget: availableWidgets.WidgetDatePicker, default: true },
    },
    DateTimeField: {
        DateTimeField: {
            component: availableFields.FieldDateTime,
            widget: availableWidgets.WidgetDatePicker,
            widgetProps: { showTime: true },
            default: true,
        },
    },
    DecimalField: {
        DecimalField: {
            component: availableFields.FieldDecimal,
            widget: availableWidgets.WidgetInputNumber,
            default: true,
        },
        PositiveDecimalField: {
            component: availableFields.FieldDecimal,
            widget: availableWidgets.WidgetInputNumber,
        },
    },
    DurationSecondsField: {
        DurationField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetDuration,
            // todo: mode for WidgetDuration to handle seconds directly
            widgetProps: { unit: "minutes" },
            default: true,
        },
    },
    DurationField: {
        DurationField: {
            component: availableFields.FieldDuration,
            widget: availableWidgets.WidgetDuration,
            fieldProps: { manyComponent: availableFields.FieldDuration },
            default: true,
        },
    },
    EmailField: {
        EmailField: {
            component: availableFields.FormField,
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { ownsLayout: true },
            widgetProps: { type: "email" },
            default: true,
        },
    },
    FileField: {
        FileField: { component: availableFields.FieldFile, widget: availableWidgets.WidgetFile, default: true },
    },
    FloatField: {
        FloatField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInputNumber,
            default: true,
        },
    },
    ImageField: {
        ImageField: { component: availableFields.FieldImage, widget: availableWidgets.WidgetImage, default: true },
    },
    IntegerField: {
        AutoField: {
            component: availableFields.FormField,
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { ownsLayout: true },
        },
        BigAutoField: {
            component: availableFields.FormField,
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { ownsLayout: true },
        },
        BigIntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInputNumber,
        },
        IntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInputNumber,
            default: true,
        },
        PositiveBigIntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInputNumber,
        },
        PositiveIntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInputNumber,
        },
        PositiveSmallIntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInputNumber,
        },
        SmallIntegerField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetInputNumber,
        },
    },
    IPAddressField: {
        IPAddressField: { component: availableFields.FieldIP, widget: availableWidgets.WidgetUnmapped, default: true },
        GenericIPAddressField: { component: availableFields.FieldIP, widget: availableWidgets.WidgetUnmapped },
    },
    JSONField: {
        JSONField: {
            component: availableFields.FieldObject,
            widget: availableWidgets.WidgetUnmapped,
            fieldProps: {},
            default: true,
        },
    },
    RangeField: {
        DateRangeField: {
            component: availableFields.FieldRange,
            widget: availableWidgets.WidgetDatePicker,
            widgetProps: { selectionMode: "range" },
            default: true,
        },
        DateTimeRangeField: {
            component: availableFields.FieldRange,
            widget: availableWidgets.WidgetDatePicker,
            widgetProps: { type: "number" },
        },
        FloatRangeField: {
            component: availableFields.FieldSetRange,
            widget: availableWidgets.WidgetInputNumber,
            boundaryComponent: availableFields.FieldDecimal,
            boundaryWidget: availableWidgets.WidgetInputNumber,
        },
        IntegerRangeField: {
            component: availableFields.FieldSetRange,
            widget: availableWidgets.WidgetInputNumber,
            boundaryComponent: availableFields.FieldNumber,
            boundaryWidget: availableWidgets.WidgetInputNumber,
        },
        TimeRangeField: {
            component: availableFields.FieldRange,
            widget: availableWidgets.WidgetDatePicker,
            widgetProps: { timeOnly: true, hourFormat: "12" },
        },
    },
    ManyRelatedField: {
        ManyToManyField: {
            component: null,
            widget: availableWidgets.WidgetSearchableSelect,
            widgetProps: { multiple: true },
            fieldProps: {
                shouldRequireFn: (value) => {
                    if (Array.isArray(value)) {
                        return value.length;
                    } else {
                        return value !== null && value !== undefined && Object.keys(value).length > 0;
                    }
                },
            },
            default: true,
        },
        ManyRelatedField: {
            component: null,
            widget: availableWidgets.WidgetSearchableSelect,
            widgetProps: { multiple: true },
            fieldProps: {
                shouldRequireFn: (value) => {
                    if (Array.isArray(value)) {
                        return value.length;
                    } else {
                        return value !== null && value !== undefined && Object.keys(value).length > 0;
                    }
                },
            },
        },
    },
    ModelField: {
        GeneratedField: {
            CharField: {
                component: availableFields.FieldString,
                widget: availableWidgets.WidgetReadOnly,
                default: true,
            },
            FloatField: {
                component: availableFields.FieldNumber,
                fieldProps: {
                    maxFractionDigits: 2,
                },
            },
            default: true,
        },
    },
    NullBooleanField: {
        NullBooleanField: {
            component: availableFields.FormField,
            widget: availableWidgets.WidgetCheckbox,
            fieldProps: { ownsLayout: true },
            default: true,
        },
    },
    PrimaryKeyRelatedField: {
        ForeignKey: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetSearchableSelect,
            default: true,
        },
        OneToOneField: { component: availableFields.FieldNumber, widget: availableWidgets.WidgetSearchableSelect },
        RelatedField: {
            component: availableFields.FieldNumber,
            widget: availableWidgets.WidgetSearchableSelect,
            widgetProps: { multiple: true },
        },
    },
    SlugRelatedField: {
        ForeignKey: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetModel,
            widgetProps: { type: "select", editable: true },
            default: true,
        },
    },
    SerializerField: {
        BinaryField: { component: null, widget: null, fieldProps: {}, default: true },
    },
    SerializerMethodField: {
        GenericForeignKey: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetGenericAutoComplete,
            fieldProps: {},
            default: true,
        },
        GenericRelation: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetGenericAutoComplete,
            fieldProps: {},
        },
    },
    SlugField: {
        SlugField: {
            component: availableFields.FormField,
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { ownsLayout: true },
            default: true,
        },
    },
    TimeField: {
        TimeField: {
            component: availableFields.FieldTime,
            widget: availableWidgets.WidgetDatePicker,
            widgetProps: { timeOnly: true, hourFormat: "12" },
            fieldProps: {},
            default: true,
        },
    },
    TemplatedTextField: {
        CharField: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetPreviewableTemplate,
            widgetProps: { type: "input" },
            default: true,
        },
        TextField: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetPreviewableTemplate,
            widgetProps: {},
        },
    },
    TemplateTagsDataField: {
        JSONField: {
            component: availableFields.FieldObject,
            widget: availableWidgets.WidgetTemplateLegend,
            default: true,
        },
    },

    URLField: {
        URLField: {
            component: availableFields.FormField,
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { ownsLayout: true },
            widgetProps: { type: "url" },
            default: true,
        },
    },
    UUIDField: {
        UUIDField: {
            component: availableFields.FieldUUID,
            widget: availableWidgets.WidgetInput,
            widgetProps: { type: "mask", mask: "****-****-****-****-************" },
            fieldProps: {},
            default: true,
        },
    },
};
/** @type {{[fieldType: string]: {[componentVariant: string]: FieldMappingEntry}}} */
export const choiceFieldMappings = {
    BooleanField: {
        BooleanField: {
            component: availableFields.FormField,
            widget: availableWidgets.WidgetRadioGroup,
            fieldProps: { ownsLayout: true },
            manyWidget: availableWidgets.WidgetRadioGroup,
            default: true,
        },
    },
    CharField: {
        CharField: {
            widget: availableWidgets.WidgetSelectDropdown,
            manyWidget: availableWidgets.WidgetMultiSelect,
            default: true,
        },
        TextField: { widget: availableWidgets.WidgetSelectDropdown, manyWidget: availableWidgets.WidgetMultiSelect },
    },
    ChoiceField: {
        CharField: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetSelectDropdown,
            manyWidget: availableWidgets.WidgetMultiSelect,
            default: true,
        },
        TextField: {
            component: availableFields.FieldString,
            widget: availableWidgets.WidgetSelectDropdown,
            manyWidget: availableWidgets.WidgetMultiSelect,
        },
    },
    EmailField: {
        EmailField: { widget: availableWidgets.WidgetTextInput, widgetProps: { type: "email" }, default: true },
    },
    ManyRelatedField: {
        ManyToManyField: {
            widget: availableWidgets.WidgetSearchableSelect,
            manyWidget: availableWidgets.WidgetSearchableSelect,
            manyWidgetProps: { multiple: true },
            default: true,
        },
        ManyRelatedField: {
            widget: availableWidgets.WidgetSearchableSelect,
            manyWidget: availableWidgets.WidgetSearchableSelect,
            manyWidgetProps: { multiple: true },
        },
    },
    NullBooleanField: {
        NullBooleanField: {
            widget: availableWidgets.WidgetCheckbox,
            default: true,
        },
    },
    PrimaryKeyRelatedField: {
        ForeignKey: { widget: availableWidgets.WidgetSearchableSelect, default: true },
        OneToOneField: { widget: availableWidgets.WidgetSearchableSelect },
        RelatedField: {
            widget: availableWidgets.WidgetSearchableSelect,
            manyWidget: availableWidgets.WidgetSearchableSelect,
            manyWidgetProps: { multiple: true },
        },
    },
    SerializerMethodField: {
        GenericForeignKey: {
            widget: availableWidgets.WidgetSearchableSelect,
            widgetMany: availableWidgets.WidgetSearchableSelect,
            default: true,
        },
        GenericRelation: {
            widget: availableWidgets.WidgetSearchableSelect,
            widgetMany: availableWidgets.WidgetSearchableSelect,
        },
    },
    SlugField: {
        SlugField: {
            widget: availableWidgets.WidgetSelectDropdown,
            widgetMany: availableWidgets.WidgetMultiSelect,
            default: true,
        },
    },
    URLField: {
        URLField: {
            widget: availableWidgets.WidgetSelectDropdown,
            widgetMany: availableWidgets.WidgetMultiSelect,
            default: true,
        },
    },
};
/** @type {{[fieldType: string]: {[componentVariant: string]: FieldMappingEntry}}} */
export const manyFieldMappings = {
    BooleanField: {
        BooleanField: {
            fieldProps: { manyComponent: availableFields.FieldBoolean },
            widget: availableWidgets.WidgetToggle,
            default: true,
        },
    },
    CharField: {
        CharField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldString },
            default: true,
        },
        TextField: {
            widget: availableWidgets.WidgetTextarea,
            fieldProps: { manyComponent: availableFields.FieldString },
        },
    },
    DateField: {
        DateField: {
            widget: availableWidgets.WidgetDatePicker,
            fieldProps: { manyComponent: availableFields.FieldDate },
            default: true,
        },
    },
    DateTimeField: {
        DateTimeField: {
            widget: availableWidgets.WidgetDatePicker,
            fieldProps: { manyComponent: availableFields.FieldDateTime },
            widgetProps: { showTime: true },
            default: true,
        },
    },
    DecimalField: {
        DecimalField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldDecimal },
            default: true,
        },
        PositiveDecimalField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldDecimal },
        },
    },
    DurationSecondsField: {
        DurationField: {
            widget: availableWidgets.WidgetDuration,
            fieldProps: { manyComponent: availableFields.FieldNumber },
            // todo: mode for WidgetDuration to handle seconds directly
            widgetProps: { unit: "minutes" },
            default: true,
        },
    },
    DurationField: {
        DurationField: {
            widget: availableWidgets.WidgetDuration,
            fieldProps: { manyComponent: availableFields.FieldDuration },
            default: true,
        },
    },
    EmailField: {
        EmailField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldEmail },
            default: true,
        },
    },
    FileField: {
        FileField: {
            widget: availableWidgets.WidgetFile,
            fieldProps: { manyComponent: availableFields.FieldString },
            default: true,
        },
    },
    FloatField: {
        FloatField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldNumber },
            default: true,
        },
    },
    ImageField: {
        ImageField: {
            widget: availableWidgets.WidgetImage,
            fieldProps: { manyComponent: availableFields.FieldImage },
            default: true,
        },
    },
    IntegerField: {
        AutoField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldString },
            default: true,
        },
        BigAutoField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldString },
        },
    },
    IntegerRangeField: {
        IntegerRangeField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldSetRange },
            default: true,
        },
    },
    IPAddressField: {
        IPAddressField: {
            widget: availableWidgets.WidgetUnmapped,
            fieldProps: { manyComponent: availableFields.FieldIP },
            default: true,
        },
        GenericIPAddressField: {
            widget: availableWidgets.WidgetUnmapped,
            fieldProps: { manyComponent: availableFields.FieldIP },
        },
    },
    JSONField: {
        JSONField: {
            widget: availableWidgets.WidgetUnmapped,
            fieldProps: { manyComponent: availableFields.FieldObject },
            default: true,
        },
    },
    DateRangeField: {
        DateRangeField: {
            widget: availableWidgets.WidgetDatePicker,
            fieldProps: { manyComponent: availableFields.FieldSetRange },
            default: true,
        },
    },
    NullBooleanField: {
        NullBooleanField: {
            widget: availableWidgets.WidgetCheckbox,
            fieldProps: { manyComponent: availableFields.FieldBoolean },
            default: true,
        },
    },
    SlugField: {
        SlugField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldString },
            default: true,
        },
    },
    TimeField: {
        TimeField: {
            widget: availableWidgets.WidgetDatePicker,
            fieldProps: { manyComponent: availableFields.FieldTime },
            default: true,
        },
    },
    TimeRangeField: {
        TimeRangeField: {
            widget: availableWidgets.WidgetDatePicker,
            fieldProps: { manyComponent: availableFields.FieldSetRange },
            default: true,
        },
    },
    URLField: {
        URLField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldURL },
            default: true,
        },
    },
    UUIDField: {
        UUIDField: {
            widget: availableWidgets.WidgetInput,
            fieldProps: { manyComponent: availableFields.FieldUUID },
            default: true,
        },
    },
};
/**
 * Field-to-component mappings for filter form fields.
 *
 * @type {{[fieldType: string]: FieldMappingEntry}}
 */
export const filterFieldMapping = {
    BooleanField: {
        component: availableFields.FieldBoolean,
        widget: availableWidgets.WidgetToggle,
    },
    CharField: { component: availableFields.FieldString, widget: availableWidgets.WidgetInput },
    ChoiceField: { component: availableFields.FieldString, widget: availableWidgets.WidgetSelectDropdown },
    NullBooleanField: {
        component: availableFields.FieldString,
        widget: availableWidgets.WidgetSelectDropdown,
    },
    ModelMultipleChoiceInField: {
        component: availableFields.FieldArray,
        widget: availableWidgets.WidgetModel,
        widgetProps: { type: "multiSelect", isFilter: true },
    },
    ModelChoiceInField: {
        component: availableFields.FieldArray,
        widget: availableWidgets.WidgetModel,
        widgetProps: { type: "multiSelect", isFilter: true },
    },
    DateRangeField: {
        component: availableFields.FieldSetRange,
        fieldProps: {
            type: "date",
            isFilter: true,
        },
        boundaryWidget: availableWidgets.WidgetDatePicker,
        boundaryWidgetProps: { showIcon: true },
        boundaryComponent: availableFields.FieldDate,
    },
    DateTimeRangeField: {
        component: availableFields.FieldSetRange,
        boundaryComponent: availableFields.FieldDate,
        boundaryWidget: availableWidgets.WidgetDatePicker,
        boundaryWidgetProps: { showTime: true },
    },
    IsoDateTimeField: {
        component: availableFields.FieldDate,
        widget: availableWidgets.WidgetDatePicker,
        widgetProps: { showTime: true },
    },
    ModelChoiceField: {
        component: availableFields.FieldString,
        widget: availableWidgets.WidgetModel,
        widgetProps: { type: "select", isFilter: true },
    },
    DecimalField: {
        component: availableFields.FieldDecimal,
        widget: availableWidgets.WidgetInputNumber,
    },
    PositiveDecimalField: {
        component: availableFields.FieldDecimal,
        widget: availableWidgets.WidgetInputNumber,
    },
};

/**
 * Merge custom field mappings into the default set used for forms.
 *
 * @param {{ [key: string]: unknown }} customMappings - Additional mappings keyed by field type.
 * @returns {typeof defaultFieldMappings} The updated default field mappings.
 * @example
 * ```js
 * import MyCustomField from '@/components/MyCustomField.vue';
 * import MyCustomWidget from '@/components/MyCustomWidget.vue';
 *
 * mergeDefaultFieldMappings({
 *     MyCustomField: {
 *         MyCustomField: { component: MyCustomField, widget: MyCustomWidget, default: true },
 *     },
 * });
 * ```
 */
export function mergeDefaultFieldMappings(customMappings) {
    return merge(defaultFieldMappings, customMappings);
}

/**
 * Merge custom field mappings used when building filter forms.
 *
 * @param {{ [key: string]: unknown }} customMappings - Additional mappings keyed by field type.
 * @returns {typeof filterFieldMapping} The updated filter field mappings.
 * @example
 * ```js
 * mergeFilterFieldMapping({
 *     MyCustomField: { component: MyCustomField, widget: MyCustomWidget },
 * });
 * ```
 */
export function mergeFilterFieldMapping(customMappings) {
    return merge(filterFieldMapping, customMappings);
}

/**
 * Merge custom field mappings used for many-to-many selections.
 *
 * @param {{ [key: string]: unknown }} customMappings - Additional mappings keyed by field type.
 * @returns {typeof manyFieldMappings} The updated many-to-many field mappings.
 * @example
 * ```js
 * mergeManyFieldMappings({
 *     MyCustomField: {
 *         MyCustomField: { widget: MyCustomWidget, fieldProps: { manyComponent: MyCustomField }, default: true },
 *     },
 * });
 * ```
 */
export function mergeManyFieldMappings(customMappings) {
    return merge(manyFieldMappings, customMappings);
}
