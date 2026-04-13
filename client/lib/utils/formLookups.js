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
};

/**
 * @typedef {()=>Promise<import('vue').Component>} WidgetComponent
 */

/** @type {{[widgetComponentName:string]: WidgetComponent}} */
export const availableWidgets = {
    WidgetCheckbox: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetCheckbox.vue")).default),
    WidgetCombobox: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetCombobox.vue")).default),
    WidgetDateField: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetDateField.vue")).default),
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
    WidgetModel: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetModel.vue")).default),
    WidgetNativeSelect: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetNativeSelect.vue")).default,
    ),
    WidgetNumberInput: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetNumberInput.vue")).default),
    WidgetRadioGroup: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetRadioGroup.vue")).default),
    WidgetReadOnly: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetReadOnly.vue")).default),
    WidgetSelectDropdown: defineAsyncComponent(
        async () => (await import("@vueda/widgets/WidgetSelectDropdown.vue")).default,
    ),
    WidgetRangeSlider: defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetRangeSlider.vue")).default),
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
