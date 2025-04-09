import { FIELD_PROPS } from "@vueda/use/useField.js";
import { useFormModel } from "@vueda/use/useFormModel.js";
import { getFieldInitialValue } from "@vueda/use/useModelInitialValues.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { getFormChoresSlotNames } from "@vueda/utils/buildForm.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import { useBreakpoints } from "@vueuse/core";
import cloneDeep from "lodash-es/cloneDeep.js";
import merge from "lodash-es/merge.js";
import { computed, inject, onBeforeUpdate, reactive, readonly, toRef, unref, useSlots, watch } from "vue";
import { deepUnref } from "vue-deepunref";

/**
 * Helper function to focus the first descendant element that can be focused.
 * @private
 * @param {HTMLElement} element - The starting place to look for descendants from.
 */
const focusFirstTabbableElement = (element) => {
    if (!element) {
        return;
    }
    const tabbableSelector =
        "a[href], " +
        // + "button:not([disabled]), "
        'input:not([disabled]):not([type="hidden"]), ' +
        "select:not([disabled]), " +
        "textarea:not([disabled]), " +
        '[tabindex]:not([tabindex="-1"])';
    const firstTabbable = element.querySelector(tabbableSelector);
    if (firstTabbable) {
        firstTabbable.focus();
    }
};

/**
 * Helper to return an empty object with initial values for each field.
 *
 * @private
 * @param {FieldSetInlineState} state - The reactive state.
 * @returns {object} An object with initial field values.
 */
const emptyFieldObject = (state) => {
    const emptyObject = {};
    if (Array.isArray(state.fieldObjects)) {
        state.fieldObjects.forEach((field) => {
            if (field.fieldName) {
                emptyObject[field.fieldName] = getFieldInitialValue(field);
            }
        });
    }
    return emptyObject;
};

export const FIELD_SET_INLINE_PROPS = {
    ...FIELD_PROPS,
    fieldComponents: {
        type: Object,
        default: undefined,
        description: "A map of field paths to async fns returning field component, as overrides.",
    },
    fieldProps: {
        type: Object,
        default: undefined,
        description: "A map of field paths to props, as overrides.",
    },
    widgetComponents: {
        type: Object,
        default: undefined,
        description: "A map of field paths to async fns returning widget component, as overrides.",
    },
    widgetProps: {
        type: Object,
        default: undefined,
        description: "A map of field paths to props, as overrides.",
    },
    fields: {
        type: Array,
        default: undefined,
        description: "A list of the field names to display for each object.",
    },
    expands: {
        type: Array,
        default: undefined,
        description: "A list of the field names to expand.",
    },
    fieldObjects: {
        type: Array,
        default: undefined,
    },
    visible: {
        type: Boolean,
        default: undefined,
    },
    hidable: {
        type: Boolean,
        default: true,
    },
    hiddenByDefault: {
        type: String,
        description:
            "Should the fieldset be hidden by default? Can be 'always', 'never', or a VUEDA breakpoint threshold, at or above the fieldset is shown by default.",
        validator: (value) => ["always", "never"].includes(value) || Object.keys(breakpointsVueda).includes(value),
        default: "lg",
    },
    showCreateButton: {
        type: Boolean,
        default: true,
    },
    ...THEME_OVERRIDE_PROPS,
};

/**
 * @callback BoundHandleSelected
 * @param {boolean} isSelected - True if the row is selected.
 * @param {number} rowIndex - The row index.
 */
/**
 * Handles selection/deselection of a row.
 *
 * @param {FieldSetInlineState} state - The reactive state.
 * @param {import('@vueda/use/useField.js').FieldContext} fieldSetContext - The field context.
 * @param {boolean} isSelected - True if the row is selected.
 * @param {number} rowIndex - The row index.
 */
const handleSelected = (state, fieldSetContext, isSelected, rowIndex) => {
    if (isSelected) {
        if (!state.selected.includes(rowIndex)) {
            state.selected.push(rowIndex);
            fieldSetContext.ignore(`${fieldSetContext.state.name}[${rowIndex}]`);
        }
    } else {
        state.selected = state.selected.filter((i) => i !== rowIndex);
        fieldSetContext.removeIgnore(`${fieldSetContext.state.name}[${rowIndex}]`);
    }
};

/**
 * @typedef {import('vue').UnwrapNestedRefs<FieldSetInlineRawState | FieldSetInlineRawComputedState>} FieldSetInlineState
 */

/**
 * @callback BoundDoCreate
 * @param {Event} _e - The triggering event.
 * @param {object} [defaultValues] - Optional default values to merge.
 */
/**
 * Creates a new object in the fieldset.
 *
 * @param {FieldSetInlineState} state - The reactive state for the instance.
 * @param {import('@vueda/use/useField.js').FieldContext} fieldSetContext - The field context.
 * @param {Event} _e - The triggering event.
 * @param {object} [defaultValues] - Optional default values to merge.
 */
const doCreate = (state, fieldSetContext, _e, defaultValues) => {
    let defaultObject = emptyFieldObject(state);
    if (defaultValues) {
        defaultObject = { ...defaultObject, ...defaultValues };
    }
    if (!state.internalVisible) {
        state.internalVisible = true;
        state.userHasToggled = true;
    }
    fieldSetContext.blur();
    fieldSetContext.state.value = fieldSetContext.state.value
        ? [...cloneDeep(fieldSetContext.state.value), defaultObject]
        : [defaultObject];
    state.focusIndex = fieldSetContext.state.value.length - 1;
};

/**
 * @callback BoundRemoveObject
 * @param {number} index - The index of the object to remove.
 */
/**
 * Removes an object from the fieldset.
 *
 * @param {import('@vueda/use/useField.js').FieldContext} fieldSetContext - The field context.
 * @param {number} index - The index of the object to remove.
 */
const removeObject = (fieldSetContext, index) => {
    fieldSetContext.blur();
    fieldSetContext.state.value = cloneDeep(fieldSetContext.state.value).filter((_, i) => i !== index);
    fieldSetContext.clearErrors(index);
    fieldSetContext.clearMessages(index);
};

/**
 * @callback BoundToggleVisibility
 */
/**
 * Toggles the visibility of the fieldset.
 *
 * @param {FieldSetInlineState} state - The reactive state.
 * @param {import('vue').EmitFn} emit - The emit function.
 */
const toggleVisibility = (state, emit) => {
    if (state.visible !== undefined) {
        emit("update:visible", !state.internalVisible);
    } else {
        state.internalVisible = !state.internalVisible;
    }
    state.userHasToggled = true;
};

/**
 * @callback BoundRefFn
 * @param {HTMLElement} el - The element reference.
 */
/**
 * Adds an element reference to the state's itemRefs array.
 *
 * @param {FieldSetInlineState} state - The reactive state.
 * @param {HTMLElement} el - The element reference.
 */
const refFn = (state, el) => {
    state.itemRefs.push(el);
};

/**
 * @typedef {
 *   import('@vueda/use/useField.js').FieldContextRawProps | import('@vueda/use/useTheme.js').ThemeRawProps |
 *   import('@vueda/use/useFormModel.js').UseFormModelRawOverridableProps
 * } FieldSetInlineRawProps
 * @property {FieldSetInlineFieldObject[]} [fieldObjects] - A list of field / action configuration objects.
 * @property {boolean} [visible] - Whether the fieldset is visible.
 * @property {boolean} [hidable] - Whether the fieldset can be hidden.
 * @property {string} [hiddenByDefault] - Should the fieldset be hidden by default? Can be 'always', 'never', or a VUEDA breakpoint threshold, at or above the fieldset is shown by default.
 * @property {boolean} [showCreateButton] - Whether to show the create button.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<FieldSetInlineRawProps>} FieldSetInlineProps
 */

/**
 * @typedef {object} FieldSetInlineOptions
 * @property {FieldSetInlineProps} props - The props passed to the FieldSetInline component.
 * @property {import('vue').EmitFn} emit - The emit function from the setup context.
 * @property {string[]} slotNames - The slot names to be resolved per field(x), fieldset-x or x.
 * @property {import('@vueda/use/useField.js').FieldContext} fieldSetContext - The field context object.
 */

/**
 * @typedef {object} FieldSetInlineInstance
 * @property {FieldSetInlineState} state - The reactive state of the FieldSetInline.
 * @property {import('@vueuse/core').Breakpoints} breakpoints - The breakpoints object.
 * @property {import('@vueda/use/useFormModel.js').UseFormModelState} formModel - The form model's reactive state.
 * @property {{[slotName: string]: import('@vueda/use/useSlotNameResolver.js').ResolvedSlotName}} - The resolved slot
 *  name instances by original slot name.
 * @property {BoundDoCreate} doCreate - The method to create a new object in the fieldset.
 * @property {BoundHandleSelected} handleSelected - The method to handle selected items.
 * @property {BoundRefFn} refFn - The method to add a reference to an item.
 * @property {BoundRemoveObject} removeObject - The method to remove an object from the fieldset.
 * @property {BoundToggleVisibility} toggleVisibility - The method to toggle the visibility of the fieldset.
 */

/**
 * Composable for handling tabular inline fieldset logic.
 *
 * @param {FieldSetInlineOptions} options - Options containing props, emit, and slotNames.
 * @returns {FieldSetInlineInstance} An object containing reactive state, computed properties, and methods
 * to manage the tabular inline fieldset.
 */
export function useFieldSetInline({ props, emit, slotNames, fieldSetContext }) {
    const breakpoints = useBreakpoints(breakpointsVueda);
    const slots = useSlots();
    const resolvedSlotNames = slotNames.reduce((acc, name) => {
        acc[name] = useSlotNameResolver(
            computed(() => [`field(${fieldSetContext.state.formModelName})${name}`, `fieldset-${name}`, name]),
            slots,
        );
        return acc;
    }, {});

    const parentFormModel = inject(FormModelSymbol, null);
    if (!parentFormModel) {
        throw new Error("useFieldSetInline must be used within a FormModel context.");
    }
    // merge the props from FieldSetInline, and the props from the formModel
    const mergedFormModelProps = reactive({
        name: props.name,
        app: parentFormModel.app,
        model: parentFormModel.model,
        view: parentFormModel.view,
        fields: computed(() => [...(parentFormModel.fields?.map((item) => item.value) || []), ...(props.fields || [])])
            .value,
        expands: computed(() => [
            ...(parentFormModel.expands?.map((item) => item.value) || []),
            ...(props.expands || []),
        ]).value,
        fieldDetails: computed(() => merge(cloneDeep(parentFormModel.fieldDetails), props.fieldDetails)),
        fieldComponents: computed(() => merge(cloneDeep(parentFormModel.fieldComponents), props.fieldComponents)),
        fieldProps: computed(() => merge(cloneDeep(parentFormModel.fieldProps), props.fieldProps)),
        expandDetails: computed(() => merge(cloneDeep(parentFormModel.expandDetails), props.expandDetails)),
        widgetComponents: computed(() => merge(cloneDeep(parentFormModel.widgetComponents), props.widgetComponents)),
        widgetProps: computed(() => merge(cloneDeep(parentFormModel.widgetProps), props.widgetProps)),
    });
    const formModel = useFormModel(mergedFormModelProps);

    const state = reactive({
        focusIndex: null,
        hidable: toRef(props, "hidable"),
        hiddenByDefault: toRef(props, "hiddenByDefault"),
        showCreateButton: computed(() => props.showCreateButton && !props.readOnly),
        internalVisible: true,
        itemRefs: [],
        selected: [],
        userHasToggled: false,
        visible: toRef(props, "visible"),
        actions: computed(() => {
            return [...state.fieldObjects].filter((field) => field.action);
        }),
        fieldNames: computed(() => {
            if (props.fields) {
                return props.fields;
            }
            const prefix = `${fieldSetContext.state.formModelName}__`;
            const hidden = formModel?.expandDetails?.[fieldSetContext.state.formModelName]?.hidden || [];

            return deepUnref(formModel.fields).reduce((acc, full) => {
                if (full?.startsWith?.(prefix)) {
                    const field = full.slice(prefix.length);
                    if (!hidden.includes(field)) {
                        acc.push(field);
                    }
                }
                return acc;
            }, []);
        }),
        fieldObjects: computed(() => {
            if (props.fieldObjects) {
                return props.fieldObjects;
            }
            const fields = formModel?.expandDetails?.[fieldSetContext.state.formModelName]?.f;
            return fields
                ? state.fieldNames?.map((name) => {
                      return {
                          fieldName: name,
                          name: `${fieldSetContext.state.formModelName}__${name}`,
                          ...fields[name],
                      };
                  })
                : [];
        }),
        isVisibleByDefault: computed(() => {
            if (state.hiddenByDefault === "always") {
                return false;
            } else if (state.hiddenByDefault === "never") {
                return true;
            } else if (Object.keys(breakpointsVueda).includes(state.hiddenByDefault)) {
                return state.greaterOrEqualHiddenBreakpoint;
            }
            return true;
        }),
        remainingSlotNames: computed(() => {
            const slotNames = Object.keys(slots);
            const knownSlotNames = [
                "default",
                `field(${fieldSetContext.state.formModelName})item-action-bar`,
                ...slotNames.flatMap((name) => unref(resolvedSlotNames?.[name]?.possibleNames)),
                ...getFormChoresSlotNames(fieldSetContext.state.formModelName),
            ];
            return slotNames.filter((slotName) => !knownSlotNames.includes(slotName));
        }),
    });
    state.greaterOrEqualHiddenBreakpoint = breakpoints.greaterOrEqual(toRef(state, "hiddenByDefault"));

    watch(
        [toRef(state, "itemRefs"), toRef(state, "focusIndex")],
        ([newItemRefs, newFocusIndex]) => {
            // noinspection EqualityComparisonWithCoercionJS
            const newItem = newItemRefs?.find?.((el) => el?.dataset?.rowIndex == newFocusIndex);
            if (newItem) {
                newItem.scrollIntoView({ behavior: "smooth", block: "center" });
                focusFirstTabbableElement(newItem.parentNode);
                state.focusIndex = null;
            }
        },
        { deep: true, flush: "post" },
    );
    watch(toRef(state, "isVisibleByDefault"), (newVal) => {
        if (!state.userHasToggled && state.visible === undefined) {
            state.internalVisible = newVal;
        }
    });
    watch(
        [toRef(state, "visible"), toRef(state, "hidable")],
        ([newVisibleVal, newHidable]) => {
            if (newVisibleVal !== undefined) {
                state.internalVisible = newVisibleVal;
            } else if (newHidable === false || state.internalVisible === undefined) {
                state.internalVisible = state.isVisibleByDefault;
            }
        },
        { immediate: true },
    );
    onBeforeUpdate(() => {
        state.itemRefs = [];
    });
    return {
        state: readonly(state),
        // sub-composition function return objects
        formModel,
        resolvedSlotNames,
        doCreate: (_e, defaultValues) => {
            doCreate(state, fieldSetContext, _e, defaultValues);
        },
        getEmptyFieldObject: () => {
            return emptyFieldObject(state);
        },
        handleSelected: (isSelected, rowIndex) => {
            handleSelected(state, fieldSetContext, isSelected, rowIndex);
        },
        refFn: (el) => {
            refFn(state, el);
        },
        removeObject: (index) => {
            removeObject(fieldSetContext, index);
        },
        toggleVisibility: () => {
            toggleVisibility(state, emit);
        },
    };
}
