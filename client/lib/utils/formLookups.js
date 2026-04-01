/**
 * @module utils/formLookups
 * @description Lazily-loaded registries of all available field and widget Vue components.
 */
import { defineAsyncComponent } from "vue";

/**
 * @typedef {()=>Promise<import('vue').Component>} FieldComponent
 */

/** @type {{[fieldComponentName:string]: FieldComponent}} */
export const availableFields = {
    FormField: defineAsyncComponent(async () => (await import("@vueda/fields/FormField.vue")).default),
    FieldArray: defineAsyncComponent(async () => (await import("@vueda/fields/FieldArray.vue")).default),
    FieldBoolean: defineAsyncComponent(async () => (await import("@vueda/fields/FieldBoolean.vue")).default),
    FieldDate: defineAsyncComponent(async () => (await import("@vueda/fields/FieldDate.vue")).default),
    FieldDateTime: defineAsyncComponent(async () => (await import("@vueda/fields/FieldDateTime.vue")).default),
    FieldDecimal: defineAsyncComponent(async () => (await import("@vueda/fields/FieldDecimal.vue")).default),
    FieldDuration: defineAsyncComponent(async () => (await import("@vueda/fields/FieldDuration.vue")).default),
    FieldEmail: defineAsyncComponent(async () => (await import("@vueda/fields/FieldEmail.vue")).default),
    FieldFile: defineAsyncComponent(async () => (await import("@vueda/fields/FieldFile.vue")).default),
    FieldImage: defineAsyncComponent(async () => (await import("@vueda/fields/FieldImage.vue")).default),
    FieldNumber: defineAsyncComponent(async () => (await import("@vueda/fields/FieldNumber.vue")).default),
    FieldObject: defineAsyncComponent(async () => (await import("@vueda/fields/FieldObject.vue")).default),
    FieldRange: defineAsyncComponent(async () => (await import("@vueda/fields/FieldRange.vue")).default),
    FieldSetMany: defineAsyncComponent(async () => (await import("@vueda/fields/FieldSetMany.vue")).default),
    FieldSetRange: defineAsyncComponent(async () => (await import("@vueda/fields/FieldSetRange.vue")).default),
    FieldSetSingularStackedInline: defineAsyncComponent(
        async () => (await import("@vueda/fields/FieldSetSingularStackedInline.vue")).default,
    ),
    FieldSetStackedInline: defineAsyncComponent(
        async () => (await import("@vueda/fields/FieldSetStackedInline.vue")).default,
    ),
    FieldSetTabularInline: defineAsyncComponent(
        async () => (await import("@vueda/fields/FieldSetTabularInline.vue")).default,
    ),
    FieldString: defineAsyncComponent(async () => (await import("@vueda/fields/FieldString.vue")).default),
    FieldTime: defineAsyncComponent(async () => (await import("@vueda/fields/FieldTime.vue")).default),
    FieldURL: defineAsyncComponent(async () => (await import("@vueda/fields/FieldURL.vue")).default),
    FieldUUID: defineAsyncComponent(async () => (await import("@vueda/fields/FieldUUID.vue")).default),
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
    WidgetCombobox: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetCombobox.vue")).default),
    WidgetDateField: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetDateField.vue")).default),
    WidgetDatePicker: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetDatePicker.vue")).default),
    WidgetDateRangeField: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetDateRangeField.vue")).default,
    ),
    WidgetDuration: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetDuration.vue")).default),
    WidgetFile: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetFile.vue")).default),
    WidgetGenericAutoComplete: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetGenericAutoComplete.vue")).default,
    ),
    WidgetHtml: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetHtml.vue")).default),
    WidgetPreviewableTemplate: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetPreviewableTemplate.vue")).default,
    ),
    WidgetTemplateLegend: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetTemplateLegend.vue")).default,
    ),
    WidgetImage: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetImage.vue")).default),
    WidgetInput: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetInput.vue")).default),
    WidgetInputNumber: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetInputNumber.vue")).default),
    WidgetModel: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetModel.vue")).default),
    WidgetMultiSelect: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetMultiSelect.vue")).default),
    WidgetNativeSelect: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetNativeSelect.vue")).default,
    ),
    WidgetNumberInput: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetNumberInput.vue")).default),
    WidgetRadio: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetRadio.vue")).default),
    WidgetRadioGroup: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetRadioGroup.vue")).default),
    WidgetReadOnly: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetReadOnly.vue")).default),
    WidgetSearchableSelect: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetSearchableSelect.vue")).default,
    ),
    WidgetSelect: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetSelect.vue")).default),
    WidgetSelectDropdown: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetSelectDropdown.vue")).default,
    ),
    WidgetRangeSlider: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetRangeSlider.vue")).default),
    WidgetSlider: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetSlider.vue")).default),
    WidgetTextarea: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetTextarea.vue")).default),
    WidgetTextInput: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetTextInput.vue")).default),
    WidgetToggle: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetToggle.vue")).default),
    WidgetTextTextarea: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetTextTextarea.vue")).default,
    ),
    WidgetTimeField: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetTimeField.vue")).default),
    WidgetTimeRangeField: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetTimeRangeField.vue")).default,
    ),
    WidgetUnmapped: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetUnmapped.vue")).default),
};
