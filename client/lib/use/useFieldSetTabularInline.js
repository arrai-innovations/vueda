import { FIELD_EMITS, useField } from "@vueda/use/useField.js";
import { FIELD_SET_INLINE_PROPS, useFieldSetInline } from "@vueda/use/useFieldSetInline.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { useBreakpoints } from "@vueuse/core";
import merge from "lodash-es/merge.js";
import { computed, reactive, readonly, toRef } from "vue";

export const FIELD_SET_TABULAR_INLINE_PROPS = { ...FIELD_SET_INLINE_PROPS };

export const FIELD_SET_TABULAR_INLINE_EMITS = [...FIELD_EMITS];

/**
 * @typedef {object} FieldSetTabularInlineRawState
 * @property {number} focusIndex=null - The index of the focused item.
 * @property {boolean} hidable=true - Whether the fieldset can be hidden.
 * @property {string} [hiddenByDefault] - Should the fieldset be hidden by default? Can be 'always', 'never', or a
 *  VUEDA breakpoint threshold, at or above the fieldset is shown by default.
 * @property {boolean} internalVisible - Whether the fieldset is visible, including the default visibility and user
 *  toggling.
 * @property {boolean} isTable=true - Whether the fieldset is displayed as a table.
 * @property {HTMLElement[]} itemRefs=[] - The references to the items in the fieldset. Used for focusing / scrolling.
 * @property {number[]} selected=[] - The indices of the selected items.
 * @property {boolean} showCreateButton=true - Whether to show the create button.
 * @property {boolean} userHasToggled=false - Whether the user has toggled the visibility.
 * @property {boolean} [visible] - Whether the fieldset is visible. If undefined, the fieldset is controlled by the
 *  user.
 */

/**
 * @typedef {object} FieldSetTabularInlineRawComputedState
 * @property {import('vue').ComputedRef<string[]>} actions - The field objects that are actions.
 * @property {import('vue').ComputedRef<object[]>} computedFieldObjects - The computed field objects, excluding actions,
 *  but including the item-action-bar.
 * @property {import('vue').ComputedRef<object>} computedFieldProps - The computed field props, including the form
 *  model's field props.
 * @property {import('vue').ComputedRef<string[]>} fieldNames - The field names to display. If not provided in fields
 *  prop, it is derived from the form model.
 * @property {import('vue').ComputedRef<object[]>} fieldObjects - The field objects to display. If not provided in
 *  fieldObjects prop, it is derived from the form model.
 * @property {import('vue').ComputedRef<boolean>} isVisibleByDefault - Whether the fieldset is visible by default.
 * @property {import('vue').ComputedRef<string[]>} remainingSlotNames - The slot names that have not been resolved. Used
 *  for passing unhandled slots to child components.
 */

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
 * @typedef {object} FieldSetTabularInlineFieldObject
 * todo: document properties
 */

/**
 * @typedef {
 *   import('@vueda/use/useField.js').FieldContextRawProps | import('@vueda/use/useTheme.js').ThemeRawProps |
 *   import('@vueda/use/useFormModel.js').UseFormModelRawOverridableProps
 * } FieldSetTabularInlineRawProps
 * @property {FieldSetTabularInlineFieldObject[]} [fieldObjects] - A list of field / action configuration objects.
 * @property {boolean} [visible] - Whether the fieldset is visible.
 * @property {boolean} [hidable] - Whether the fieldset can be hidden.
 * @property {string} [hiddenByDefault] - Should the fieldset be hidden by default? Can be 'always', 'never', or a VUEDA breakpoint threshold, at or above the fieldset is shown by default.
 * @property {boolean} [showCreateButton] - Whether to show the create button.
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
 * @typedef {object} FieldSetTabularInlineInstance
 * @property {FieldSetTabularInlineState} state - The reactive state of the FieldSetTabularInline.
 * @property {import('@vueuse/core').Breakpoints} breakpoints - The breakpoints object.
 * @property {import('@vueda/use/useField.js').FieldContext} fieldSetContext - The field context object.
 * @property {import('@vueda/use/useFormModel.js').UseFormModelState} formModel - The form model's reactive state.
 * @property {{[slotName: string]: import('@vueda/use/useSlotNameResolver.js').ResolvedSlotName}} - The resolved slot
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
 * @returns {FieldSetTabularInlineInstance} An object containing reactive state, computed properties, and methods
 * to manage the tabular inline fieldset.
 */
export function useFieldSetTabularInline({ props, emit, slotNames }) {
    const theme = useTheme("FieldSetTabularInline", props);
    const fieldSetContext = useField(props, emit);
    const breakpoints = useBreakpoints(breakpointsVueda);
    const fieldSetInline = useFieldSetInline({ props, emit, slotNames, fieldSetContext });
    const state = reactive({
        hidable: fieldSetInline.state.hidable,
        internalVisible: toRef(fieldSetInline.state, "internalVisible"),
        isTable: true,
        selected: toRef(fieldSetInline.state, "selected"),
        showCreateButton: toRef(fieldSetInline.state, "showCreateButton"),
        actions: toRef(fieldSetInline.state, "actions"),
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
        fieldObjects: toRef(fieldSetInline.state, "fieldObjects"),
        remainingSlotNames: toRef(fieldSetInline.state, "remainingSlotNames"),
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
