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
 * @property {import('vue').Component|null} [component] - The field component override. Only used by filterFieldMapping; defaultFieldMappings and choiceFieldMappings rely on FormField as the hardcoded default.
 * @property {import('vue').Component|null} widget - The widget component, or null if none.
 * @property {object} [fieldProps] - Extra props forwarded to the field component.
 * @property {object} [widgetProps] - Extra props forwarded to the widget component.
 * @property {import('vue').Component} [manyComponent] - Component for many-field wrappers.
 * @property {import('vue').Component} [manyWidget] - Widget for many-field wrappers.
 * @property {object} [manyWidgetProps] - Extra props for the many-field widget.
 * @property {import('vue').Component} [boundaryComponent] - Component for range field boundaries.
 * @property {import('vue').Component} [boundaryWidget] - Widget for range field boundaries.
 * @property {object} [boundaryFieldProps] - Extra props forwarded to the range boundary field component.
 * @property {object} [boundaryWidgetProps] - Extra props for the range boundary widget.
 * @property {boolean} [default] - Whether this is the default mapping for its serializer field type.
 */

/** @type {{[fieldType: string]: {[componentVariant: string]: FieldMappingEntry}}} */
export const defaultFieldMappings = {
    BooleanField: {
        BooleanField: {
            widget: availableWidgets.WidgetToggle,
            default: true,
        },
    },
    CharField: {
        CharField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { validation: "text" },
            default: true,
        },
        TextField: {
            widget: availableWidgets.WidgetTextTextarea,
            fieldProps: { validation: "text" },
        },
    },
    DateField: {
        DateField: {
            widget: availableWidgets.WidgetDateField,
            fieldProps: { validation: "date" },
            default: true,
        },
    },
    DateTimeField: {
        DateTimeField: {
            widget: availableWidgets.WidgetDateField,
            fieldProps: { validation: "datetime" },
            widgetProps: { granularity: "minute" },
            default: true,
        },
    },
    DecimalField: {
        DecimalField: {
            widget: availableWidgets.WidgetNumberInput,
            fieldProps: { validation: "decimal" },
            default: true,
        },
        PositiveDecimalField: {
            widget: availableWidgets.WidgetNumberInput,
            fieldProps: { validation: "decimal" },
        },
    },
    DurationSecondsField: {
        DurationField: {
            widget: availableWidgets.WidgetDuration,
            // todo: mode for WidgetDuration to handle seconds directly
            widgetProps: { unit: "minutes" },
            default: true,
        },
    },
    DurationField: {
        DurationField: {
            widget: availableWidgets.WidgetDuration,
            default: true,
        },
    },
    EmailField: {
        EmailField: {
            widget: availableWidgets.WidgetTextInput,
            widgetProps: { type: "email" },
            default: true,
        },
    },
    FileField: {
        FileField: {
            widget: availableWidgets.WidgetFile,
            default: true,
        },
    },
    FloatField: {
        FloatField: {
            widget: availableWidgets.WidgetNumberInput,
            fieldProps: { validation: "numeric" },
            default: true,
        },
    },
    ImageField: {
        ImageField: {
            widget: availableWidgets.WidgetImage,
            default: true,
        },
    },
    IntegerField: {
        AutoField: {
            widget: availableWidgets.WidgetTextInput,
        },
        BigAutoField: {
            widget: availableWidgets.WidgetTextInput,
        },
        BigIntegerField: {
            widget: availableWidgets.WidgetNumberInput,
            fieldProps: { validation: "numeric" },
        },
        IntegerField: {
            widget: availableWidgets.WidgetNumberInput,
            fieldProps: { validation: "numeric" },
            default: true,
        },
        PositiveBigIntegerField: {
            widget: availableWidgets.WidgetNumberInput,
            fieldProps: { validation: "numeric" },
        },
        PositiveIntegerField: {
            widget: availableWidgets.WidgetNumberInput,
            fieldProps: { validation: "numeric" },
        },
        PositiveSmallIntegerField: {
            widget: availableWidgets.WidgetNumberInput,
            fieldProps: { validation: "numeric" },
        },
        SmallIntegerField: {
            widget: availableWidgets.WidgetNumberInput,
            fieldProps: { validation: "numeric" },
        },
    },
    IPAddressField: {
        IPAddressField: {
            widget: availableWidgets.WidgetUnmapped,
            default: true,
        },
        GenericIPAddressField: {
            widget: availableWidgets.WidgetUnmapped,
        },
    },
    JSONField: {
        JSONField: {
            widget: availableWidgets.WidgetUnmapped,
            default: true,
        },
    },
    RangeField: {
        DateRangeField: {
            widget: availableWidgets.WidgetDateRangeField,
            default: true,
        },
        DateTimeRangeField: {
            widget: availableWidgets.WidgetDateRangeField,
            widgetProps: { granularity: "minute" },
        },
        FloatRangeField: {
            widget: availableWidgets.WidgetNumberInput,
            boundaryComponent: availableFields.FieldDecimal,
            boundaryWidget: availableWidgets.WidgetNumberInput,
        },
        IntegerRangeField: {
            widget: availableWidgets.WidgetNumberInput,
            boundaryComponent: availableFields.FieldNumber,
            boundaryWidget: availableWidgets.WidgetNumberInput,
        },
        TimeRangeField: {
            widget: availableWidgets.WidgetTimeRangeField,
        },
    },
    ManyRelatedField: {
        ManyToManyField: {
            widget: availableWidgets.WidgetCombobox,
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
            widget: availableWidgets.WidgetCombobox,
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
                widget: availableWidgets.WidgetReadOnly,
                default: true,
            },
            FloatField: {
                widget: availableWidgets.WidgetReadOnly,
                fieldProps: { validation: "numeric" },
            },
            default: true,
        },
    },
    NullBooleanField: {
        NullBooleanField: {
            widget: availableWidgets.WidgetCheckbox,
            default: true,
        },
    },
    PrimaryKeyRelatedField: {
        ForeignKey: {
            widget: availableWidgets.WidgetCombobox,
            default: true,
        },
        OneToOneField: {
            widget: availableWidgets.WidgetCombobox,
        },
        RelatedField: {
            widget: availableWidgets.WidgetCombobox,
            widgetProps: { multiple: true },
        },
    },
    SlugRelatedField: {
        ForeignKey: {
            widget: availableWidgets.WidgetModel,
            fieldProps: { validation: "text" },
            widgetProps: { type: "select", editable: true },
            default: true,
        },
    },
    SerializerField: {
        BinaryField: { widget: null, fieldProps: {}, default: true },
    },
    SerializerMethodField: {
        GenericForeignKey: {
            widget: availableWidgets.WidgetGenericAutoComplete,
            default: true,
        },
        GenericRelation: {
            widget: availableWidgets.WidgetGenericAutoComplete,
        },
    },
    SlugField: {
        SlugField: {
            widget: availableWidgets.WidgetTextInput,
            default: true,
        },
    },
    TimeField: {
        TimeField: {
            widget: availableWidgets.WidgetTimeField,
            fieldProps: { validation: "time" },
            default: true,
        },
    },
    TemplatedTextField: {
        CharField: {
            widget: availableWidgets.WidgetPreviewableTemplate,
            fieldProps: { validation: "text" },
            widgetProps: { type: "input" },
            default: true,
        },
        TextField: {
            widget: availableWidgets.WidgetPreviewableTemplate,
            fieldProps: { validation: "text" },
            widgetProps: {},
        },
    },
    TemplateTagsDataField: {
        JSONField: {
            widget: availableWidgets.WidgetTemplateLegend,
            default: true,
        },
    },

    URLField: {
        URLField: {
            widget: availableWidgets.WidgetTextInput,
            widgetProps: { type: "url" },
            default: true,
        },
    },
    UUIDField: {
        UUIDField: {
            widget: availableWidgets.WidgetTextInput,
            widgetProps: { mask: "********-****-****-****-************" },
            default: true,
        },
    },
};
/** @type {{[fieldType: string]: {[componentVariant: string]: FieldMappingEntry}}} */
export const choiceFieldMappings = {
    BooleanField: {
        BooleanField: {
            widget: availableWidgets.WidgetRadioGroup,
            manyWidget: availableWidgets.WidgetRadioGroup,
            default: true,
        },
    },
    CharField: {
        CharField: {
            widget: availableWidgets.WidgetSelectDropdown,
            manyWidget: availableWidgets.WidgetCombobox,
            manyWidgetProps: { multiple: true },
            default: true,
        },
        TextField: {
            widget: availableWidgets.WidgetSelectDropdown,
            manyWidget: availableWidgets.WidgetCombobox,
            manyWidgetProps: { multiple: true },
        },
    },
    ChoiceField: {
        CharField: {
            widget: availableWidgets.WidgetSelectDropdown,
            fieldProps: { validation: "text" },
            manyWidget: availableWidgets.WidgetCombobox,
            manyWidgetProps: { multiple: true },
            default: true,
        },
        TextField: {
            widget: availableWidgets.WidgetSelectDropdown,
            fieldProps: { validation: "text" },
            manyWidget: availableWidgets.WidgetCombobox,
            manyWidgetProps: { multiple: true },
        },
    },
    EmailField: {
        EmailField: { widget: availableWidgets.WidgetTextInput, widgetProps: { type: "email" }, default: true },
    },
    ManyRelatedField: {
        ManyToManyField: {
            widget: availableWidgets.WidgetCombobox,
            manyWidget: availableWidgets.WidgetCombobox,
            manyWidgetProps: { multiple: true },
            default: true,
        },
        ManyRelatedField: {
            widget: availableWidgets.WidgetCombobox,
            manyWidget: availableWidgets.WidgetCombobox,
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
        ForeignKey: { widget: availableWidgets.WidgetCombobox, default: true },
        OneToOneField: { widget: availableWidgets.WidgetCombobox },
        RelatedField: {
            widget: availableWidgets.WidgetCombobox,
            manyWidget: availableWidgets.WidgetCombobox,
            manyWidgetProps: { multiple: true },
        },
    },
    SerializerMethodField: {
        GenericForeignKey: {
            widget: availableWidgets.WidgetCombobox,
            manyWidget: availableWidgets.WidgetCombobox,
            default: true,
        },
        GenericRelation: {
            widget: availableWidgets.WidgetCombobox,
            manyWidget: availableWidgets.WidgetCombobox,
        },
    },
    SlugField: {
        SlugField: {
            widget: availableWidgets.WidgetSelectDropdown,
            manyWidget: availableWidgets.WidgetCombobox,
            manyWidgetProps: { multiple: true },
            default: true,
        },
    },
    URLField: {
        URLField: {
            widget: availableWidgets.WidgetSelectDropdown,
            manyWidget: availableWidgets.WidgetCombobox,
            manyWidgetProps: { multiple: true },
            default: true,
        },
    },
};
/** @type {{[fieldType: string]: {[componentVariant: string]: FieldMappingEntry}}} */
export const manyFieldMappings = {
    BooleanField: {
        BooleanField: {
            fieldProps: { manyComponent: availableFields.FormField },
            widget: availableWidgets.WidgetToggle,
            default: true,
        },
    },
    CharField: {
        CharField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
        TextField: {
            widget: availableWidgets.WidgetTextTextarea,
            fieldProps: { manyComponent: availableFields.FormField },
        },
    },
    DateField: {
        DateField: {
            widget: availableWidgets.WidgetDateField,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
    },
    DateTimeField: {
        DateTimeField: {
            widget: availableWidgets.WidgetDateField,
            fieldProps: { manyComponent: availableFields.FormField },
            widgetProps: { granularity: "minute" },
            default: true,
        },
    },
    DecimalField: {
        DecimalField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
        PositiveDecimalField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { manyComponent: availableFields.FormField },
        },
    },
    DurationSecondsField: {
        DurationField: {
            widget: availableWidgets.WidgetDuration,
            fieldProps: { manyComponent: availableFields.FormField },
            // todo: mode for WidgetDuration to handle seconds directly
            widgetProps: { unit: "minutes" },
            default: true,
        },
    },
    DurationField: {
        DurationField: {
            widget: availableWidgets.WidgetDuration,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
    },
    EmailField: {
        EmailField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
    },
    FileField: {
        FileField: {
            widget: availableWidgets.WidgetFile,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
    },
    FloatField: {
        FloatField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
    },
    ImageField: {
        ImageField: {
            widget: availableWidgets.WidgetImage,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
    },
    IntegerField: {
        AutoField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
        BigAutoField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { manyComponent: availableFields.FormField },
        },
    },
    IntegerRangeField: {
        IntegerRangeField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { manyComponent: availableFields.FieldSetRange },
            default: true,
        },
    },
    IPAddressField: {
        IPAddressField: {
            widget: availableWidgets.WidgetUnmapped,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
        GenericIPAddressField: {
            widget: availableWidgets.WidgetUnmapped,
            fieldProps: { manyComponent: availableFields.FormField },
        },
    },
    JSONField: {
        JSONField: {
            widget: availableWidgets.WidgetUnmapped,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
    },
    DateRangeField: {
        DateRangeField: {
            widget: availableWidgets.WidgetDateRangeField,
            fieldProps: { manyComponent: availableFields.FieldSetRange },
            default: true,
        },
    },
    NullBooleanField: {
        NullBooleanField: {
            widget: availableWidgets.WidgetCheckbox,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
    },
    SlugField: {
        SlugField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
    },
    TimeField: {
        TimeField: {
            widget: availableWidgets.WidgetTimeField,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
    },
    TimeRangeField: {
        TimeRangeField: {
            widget: availableWidgets.WidgetTimeRangeField,
            fieldProps: { manyComponent: availableFields.FieldSetRange },
            default: true,
        },
    },
    URLField: {
        URLField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { manyComponent: availableFields.FormField },
            default: true,
        },
    },
    UUIDField: {
        UUIDField: {
            widget: availableWidgets.WidgetTextInput,
            fieldProps: { manyComponent: availableFields.FormField },
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
        component: availableFields.FormField,
        fieldProps: { hidden: true },
        widget: availableWidgets.WidgetToggle,
    },
    CharField: {
        component: availableFields.FormField,
        fieldProps: { validation: "text", hidden: true },
        widget: availableWidgets.WidgetTextInput,
    },
    ChoiceField: {
        component: availableFields.FormField,
        fieldProps: { validation: "text", hidden: true },
        widget: availableWidgets.WidgetSelectDropdown,
    },
    NullBooleanField: {
        component: availableFields.FormField,
        fieldProps: { validation: "text", hidden: true },
        widget: availableWidgets.WidgetSelectDropdown,
    },
    ModelMultipleChoiceInField: {
        component: availableFields.FormField,
        fieldProps: { hidden: true },
        widget: availableWidgets.WidgetModel,
        widgetProps: { type: "multiSelect", isFilter: true },
    },
    ModelChoiceInField: {
        component: availableFields.FormField,
        fieldProps: { hidden: true },
        widget: availableWidgets.WidgetModel,
        widgetProps: { type: "multiSelect", isFilter: true },
    },
    DateRangeField: {
        component: availableFields.FieldSetRange,
        fieldProps: {
            type: "date",
            isFilter: true,
        },
        boundaryWidget: availableWidgets.WidgetDateField,
        boundaryComponent: availableFields.FormField,
        boundaryFieldProps: { validation: "date" },
    },
    DateTimeRangeField: {
        component: availableFields.FieldSetRange,
        boundaryComponent: availableFields.FormField,
        boundaryFieldProps: { validation: "datetime" },
        boundaryWidget: availableWidgets.WidgetDateField,
        boundaryWidgetProps: { granularity: "minute" },
    },
    IsoDateTimeField: {
        component: availableFields.FormField,
        fieldProps: { validation: "date", hidden: true },
        widget: availableWidgets.WidgetDateField,
        widgetProps: { granularity: "minute" },
    },
    ModelChoiceField: {
        component: availableFields.FormField,
        fieldProps: { validation: "text", hidden: true },
        widget: availableWidgets.WidgetModel,
        widgetProps: { type: "select", isFilter: true },
    },
    DecimalField: {
        component: availableFields.FormField,
        fieldProps: { validation: "decimal", hidden: true },
        widget: availableWidgets.WidgetNumberInput,
    },
    PositiveDecimalField: {
        component: availableFields.FormField,
        fieldProps: { validation: "decimal", hidden: true },
        widget: availableWidgets.WidgetNumberInput,
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
