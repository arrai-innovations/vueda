/**
 * @module utils/formLookups
 * @description Lazily-loaded registries of all available field and widget Vue components.
 */
import { defineAsyncComponent, markRaw } from "vue";

/**
 * @typedef {()=>Promise<import('vue').Component>} FieldComponent
 */

/** @type {{[fieldComponentName:string]: FieldComponent}} */
export const availableFields = {
    FormField: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/form/form-model/FormField.vue")).default),
    ),
    FieldSetMany: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/form/field-set/FieldSetMany.vue")).default),
    ),
    FieldSetRange: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/form/field-set/FieldSetRange.vue")).default),
    ),
    FieldSetSingularStackedInline: markRaw(
        defineAsyncComponent(
            async () => (await import("@vueda/form/field-set/FieldSetSingularStackedInline.vue")).default,
        ),
    ),
    FieldSetStackedInline: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/form/field-set/FieldSetStackedInline.vue")).default),
    ),
    FieldSetTabularInline: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/form/field-set/FieldSetTabularInline.vue")).default),
    ),
};

/**
 * @typedef {()=>Promise<import('vue').Component>} WidgetComponent
 */

/** @type {{[widgetComponentName:string]: WidgetComponent}} */
export const availableWidgets = {
    WidgetCheckbox: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetCheckbox.vue")).default),
    ),
    WidgetCombobox: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetCombobox.vue")).default),
    ),
    WidgetDateField: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetDateField.vue")).default),
    ),
    WidgetDateRangeField: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetDateRangeField.vue")).default),
    ),
    WidgetDuration: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetDuration.vue")).default),
    ),
    WidgetFile: markRaw(defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetFile.vue")).default)),
    WidgetGenericAutoComplete: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetGenericAutoComplete.vue")).default),
    ),
    WidgetHtml: markRaw(defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetHtml.vue")).default)),
    WidgetJson: markRaw(defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetJson.vue")).default)),
    WidgetPreviewableTemplate: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetPreviewableTemplate.vue")).default),
    ),
    WidgetTemplateLegend: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetTemplateLegend.vue")).default),
    ),
    WidgetImage: markRaw(defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetImage.vue")).default)),
    WidgetModel: markRaw(defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetModel.vue")).default)),
    WidgetNativeSelect: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetNativeSelect.vue")).default),
    ),
    WidgetNumberInput: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetNumberInput.vue")).default),
    ),
    WidgetRadioGroup: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetRadioGroup.vue")).default),
    ),
    WidgetBooleanReadOnly: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetBooleanReadOnly.vue")).default),
    ),
    WidgetDateTimeReadOnly: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetDateTimeReadOnly.vue")).default),
    ),
    WidgetReadOnly: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetReadOnly.vue")).default),
    ),
    WidgetSelectDropdown: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetSelectDropdown.vue")).default),
    ),
    WidgetRangeSlider: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetRangeSlider.vue")).default),
    ),
    WidgetTextInput: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetTextInput.vue")).default),
    ),
    WidgetToggle: markRaw(defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetToggle.vue")).default)),
    WidgetTextTextarea: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetTextTextarea.vue")).default),
    ),
    WidgetTimeField: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetTimeField.vue")).default),
    ),
    WidgetTimeRangeField: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetTimeRangeField.vue")).default),
    ),
    WidgetUnmapped: markRaw(
        defineAsyncComponent(async () => (await import("@vueda/widgets/WidgetUnmapped.vue")).default),
    ),
};
