/**
 * @module use/useFieldSetTabularInline
 * @description Extends the inline field-set composable with responsive breakpoint logic to switch between table and stacked display modes.
 */
import { FIELD_EMITS, useField } from "@vueda/use/useField.js";
import { FIELD_SET_INLINE_PROPS, useFieldSetInline } from "@vueda/use/useFieldSetInline.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { useBreakpoints } from "@vueuse/core";
import merge from "lodash-es/merge.js";
import { computed, reactive, readonly, toRefs } from "vue";

/** Vue component props definition for tabular inline field-set components. Inherits all props from FIELD_SET_INLINE_PROPS for use in table-style repeatable child-row layouts. */
export const FIELD_SET_TABULAR_INLINE_PROPS = { ...FIELD_SET_INLINE_PROPS };

/** Array of Vue event names emitted by tabular inline field-set components. Pass to the `emits` option of a tabular inline field-set component. */
export const FIELD_SET_TABULAR_INLINE_EMITS = [...FIELD_EMITS];

/**
 * @callback BoundHandleIsTableUpdate
 * @param {boolean} newValue - The new table mode value.
 */
/**
 * Updates the table mode state.
 *
 * @param {FieldSetTabularInlineState} state - The reactive state for the instance.
 * @param {boolean} newValue - The new table mode value.
 */
const handleIsTableUpdate = (state, newValue) => {
    state.isTable = newValue;
};

/**
 * @typedef {object} FieldSetTabularInlineMyRawProps
 * @property {object} fieldProps - The field props to be passed to the field objects.
 */

/**
 * @typedef {import('@vueda/use/useField.js').FieldContextRawProps & import('@vueda/use/useTheme.js').ThemeRawProps &
 *   import('@vueda/use/useFormModel.js').UseFormModelRawOverridableProps & FieldSetTabularInlineMyRawProps
 * } FieldSetTabularInlineRawProps
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<FieldSetTabularInlineRawProps>} FieldSetTabularInlineProps
 */

/**
 * @typedef {object} FieldSetTabularInlineOptions
 * @property {FieldSetTabularInlineProps} props - The props passed to the FieldSetTabularInline component.
 * @property {import('vue').EmitFn} emit - The emit function from the setup context.
 * @property {string[]} slotNames - The slot names to be resolved per field(x), fieldset-x or x.
 */

/**
 * @typedef {object} FieldSetTabularInlineRawState
 * @property {boolean} [isTable=true] - Whether the fieldset is displayed as a table.
 * @property {import('vue').ComputedRef<object[]>} computedFieldObjects - The displayable field objects, excluding actions.
 *  If any actions exist, includes a synthetic 'item-action-bar' field first.
 * @property {import('vue').ComputedRef<object>} computedFieldProps - The computed field props, including the form
 *  model's field props.
 * @property {{ widgetContext: import('@vueda/use/useWidget.js').WidgetContext, props: import('vue').UnwrapNestedRefs<object> }[]} widgetContextItems - The widget
 *  contexts registered from within the fieldset.
 */

// @property {import('@vueda/use/useWidget.js').WidgetContext[]} widgetContexts - The widget contexts registered from
//  within the fieldset.

/**
 * @typedef {import('vue').UnwrapNestedRefs<
 *     import('@vueda/use/useFieldSetInline.js').FieldSetInlineRawState &
 *     FieldSetTabularInlineRawState
 * >} FieldSetTabularInlineState
 */

/**
 * @typedef {object} FieldSetTabularInlineContext
 * @property {import('vue').Readonly<FieldSetTabularInlineState>} state - The reactive state of the FieldSetTabularInline.
 * @property {import('@vueuse/core').Breakpoints} breakpoints - The breakpoints object.
 * @property {import('@vueda/use/useField.js').FieldContext} fieldSetContext - The field context object.
 * @property {import('@vueda/use/useFormModel.js').UseFormModelState} formModel - The form model's reactive state.
 * @property {{[slotName: string]: import('@vueda/use/useSlotNameResolver.js').ResolvedSlotName}} resolvedSlotNames - The resolved slot
 *  name instances by original slot name.
 * @property {import('@vueda/use/useTheme.js').UseThemeReturnFunction} theme - The theme fn for the FieldSetTabularInline.
 * @property {BoundDoCreate} doCreate - The method to create a new object in the fieldset.
 * @property {BoundHandleIsTableUpdate} handleIsTableUpdate - The method to update the isTable state.
 * @property {BoundHandleSelected} handleSelected - The method to handle selected items.
 * @property {BoundRefFn} refFn - The method to add a reference to an item.
 * @property {BoundRemoveObject} removeObject - The method to remove an object from the fieldset.
 * @property {BoundToggleVisibility} toggleVisibility - The method to toggle the visibility of the fieldset.
 */

/**
 * Composable for handling tabular inline fieldset logic.
 *
 * @param {FieldSetTabularInlineOptions} options - Options containing props, emit, and slotNames.
 * @returns {FieldSetTabularInlineContext} An object containing reactive state, computed properties, and methods
 * to manage the tabular inline fieldset.
 */
export function useFieldSetTabularInline({ props, emit, slotNames }) {
    const theme = useTheme("FieldSetTabularInline", props);
    const fieldSetContext = useField(props, emit);
    const breakpoints = useBreakpoints(breakpointsVueda);
    const fieldSetInline = useFieldSetInline({ props, emit, slotNames, fieldSetContext });
    const baseState = toRefs(fieldSetInline.state);
    /** @type {FieldSetTabularInlineState} */
    const state = reactive({
        ...baseState,
        isTable: true,
        computedFieldObjects: computed(() => {
            const objects = [];
            if (state.actions.length) {
                objects.push({
                    name: "item-action-bar",
                });
            }
            objects.push(...state.fieldObjects);

            return objects.filter((field) => !field.action);
        }),
        computedFieldProps: computed(() =>
            merge(fieldSetInline.formModel.fieldProps[fieldSetContext.state.formModelName], props.fieldProps),
        ),
    });

    return {
        state: readonly(state),
        breakpoints,
        fieldSetContext,
        formModel: fieldSetInline.formModel,
        resolvedSlotNames: fieldSetInline.resolvedSlotNames,
        theme,
        doCreate: fieldSetInline.doCreate,
        handleIsTableUpdate: (newValue) => {
            handleIsTableUpdate(state, newValue);
        },
        handleSelected: fieldSetInline.handleSelected,
        refFn: fieldSetInline.refFn,
        removeObject: fieldSetInline.removeObject,
        toggleVisibility: fieldSetInline.toggleVisibility,
    };
}
