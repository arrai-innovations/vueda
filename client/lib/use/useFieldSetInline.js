/**
 * @module use/useFieldSetInline
 * @description Manages an inline field-set (repeatable child rows) within a form, handling row addition, deletion, reordering, and slot resolution.
 */
import { deepUnref } from "@arrai-innovations/reactive-helpers";
import { FIELD_PROPS } from "@vueda/use/useField.js";
import { useFormModel } from "@vueda/use/useFormModel.js";
import { getFieldInitialValue } from "@vueda/use/useModelInitialValues.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { FormContextSymbol, FormModelSymbol } from "@vueda/utils/symbols.js";
import { useBreakpoints } from "@vueuse/core";
import cloneDeep from "lodash-es/cloneDeep.js";
import merge from "lodash-es/merge.js";
import omit from "lodash-es/omit.js";
import { computed, inject, onBeforeUpdate, reactive, readonly, toRef, unref, useSlots, watch } from "vue";

/**
 * Helper function to focus the first descendant element that can be focused.
 * @private
 * @param {HTMLElement|null} element - The starting place to look for descendants from.
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
 * @param {FieldSetInlineRawState} state - The reactive state.
 * @returns {{[fieldName: string]: any}} An object with initial field values.
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

/** Vue component props definition for inline field-set components. Extends FIELD_PROPS with field override maps, visibility controls, and theme override support for repeatable child-row layouts. */
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
    expand: {
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
 * @param {FieldSetInlineRawState} state - The reactive state.
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
 * @typedef {object} FieldSetInlineRawState
 * @property {number|null} focusIndex - The index of the focused item.
 * @property {import('vue').Ref<boolean>} hidable - Whether the fieldset can be hidden.
 * @property {import('vue').Ref<string>} hiddenByDefault - The default visibility of the fieldset.
 * @property {import('vue').ComputedRef<boolean>} showCreateButton - Whether to show the create button.
 * @property {boolean} internalVisible - The internal visibility state of the fieldset.
 * @property {HTMLElement[]} itemRefs - The references to the items in the fieldset.
 * @property {number[]} selected - The indices of the selected items.
 * @property {boolean} userHasToggled - Whether the user has toggled the visibility of the fieldset.
 * @property {import('vue').Ref<boolean|undefined>} visible - The visibility state of the fieldset.
 * @property {import('vue').ComputedRef<object[]>} actions - Row actions, including destroy when the inline is writable.
 * @property {import('vue').ComputedRef<string[]>} fieldNames - The field names to display for each object.
 * @property {import('vue').ComputedRef<FieldSetInlineFieldObject[]>} fieldObjects - The field objects to display.
 * @property {import('vue').ComputedRef<boolean>} isVisibleByDefault - Whether the fieldset is visible by default.
 * @property {import('vue').ComputedRef<string[]>} remainingSlotNames - The slot names that have not been resolved.
 * @property {import('@vueuse/core').Ref<boolean>} greaterOrEqualHiddenBreakpoint - Whether the fieldset is at or above the hiddenByDefault breakpoint.
 */

/**
 * @typedef {import('vue').UnwrapNestedRefs<FieldSetInlineRawState>} FieldSetInlineState
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
    fieldSetContext.blur();
    fieldSetContext.state.value = fieldSetContext.state.value
        ? [...cloneDeep(fieldSetContext.state.value), defaultObject]
        : [defaultObject];
    state.focusIndex = fieldSetContext.state.value.length - 1;
};

/**
 * @callback BoundRemoveObject
 * @param {number} index - The index of the object to remove.
 * @returns {void}
 */
/**
 * Removes an object from the fieldset, moving selection and per-row form state
 * with the remaining rows.
 *
 * @param {FieldSetInlineRawState} state - The reactive state.
 * @param {import('@vueda/use/useField.js').FieldContext} fieldSetContext - The field context.
 * @param {import('@vueda/use/useForm.js').FormContext|null} formContext - The form context, or null when contextless.
 * @param {number} index - The index of the object to remove.
 */
const removeObject = (state, fieldSetContext, formContext, index) => {
    fieldSetContext.blur();
    const selected = state.selected
        .filter((rowIndex) => rowIndex !== index)
        .map((rowIndex) => (rowIndex > index ? rowIndex - 1 : rowIndex));
    if (formContext) {
        // Shifts values, errors, messages, touched, ignored, and focus together.
        formContext.removeArrayItem(fieldSetContext.state.name, index);
        state.selected = selected;
        return;
    }
    for (const rowIndex of [...state.selected]) {
        handleSelected(state, fieldSetContext, false, rowIndex);
    }
    fieldSetContext.state.value = cloneDeep(fieldSetContext.state.value).filter((_, i) => i !== index);
    fieldSetContext.clearErrors(index);
    fieldSetContext.clearMessages(index);
    for (const rowIndex of selected) {
        handleSelected(state, fieldSetContext, true, rowIndex);
    }
};

/**
 * @callback BoundToggleVisibility
 */
/**
 * Sets visibility locally or requests a controlled visibility change.
 *
 * @param {FieldSetInlineRawState} state - The reactive state.
 * @param {import('vue').EmitFn} emit - The emit function.
 * @param {boolean} visible - Whether the body should be open.
 * @returns {void}
 */
const setVisibility = (state, emit, visible) => {
    if (state.visible !== undefined) {
        emit("update:visible", visible);
    } else {
        state.internalVisible = visible;
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
 * @param {FieldSetInlineRawState} state - The reactive state.
 * @param {HTMLElement} el - The element reference.
 */
const refFn = (state, el) => {
    state.itemRefs.push(el);
};

/**
 * @typedef {import('@vueda/stores/storeModelInfo.js').FieldInfo} FieldSetInlineFieldObject
 * @property {string} fieldName - The short name of the field, relative to the fieldset.
 * @property {string} name - The full name of the field, including the fieldset name.
 */

/**
 * @typedef {import('@vueda/use/useField.js').FieldContextRawProps & import('@vueda/use/useTheme.js').ThemeRawProps &
 *   import('@vueda/use/useFormModel.js').UseFormModelRawOverridableProps & {
 *     fieldObjects?: import('@vueda/stores/storeModelInfo.js').FieldInfo[],
 *     visible?: boolean,
 *     hidable?: boolean,
 *     hiddenByDefault?: string,
 *     showCreateButton?: boolean
 *   }} FieldSetInlineRawProps
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
 * @property {boolean} [addDestroyAction=false] - Add a default destroy action to writable inlines that lack one.
 */

/**
 * @typedef {object} FieldSetInlineInstance
 * @property {import('vue').Readonly<FieldSetInlineState>} state - The reactive state of the FieldSetInline.
 * @property {import('@vueuse/core').Breakpoints} breakpoints - The breakpoints object.
 * @property {import('@vueda/use/useFormModel.js').UseFormModelState} formModel - The form model's reactive state.
 * @property {{[slotName: string]: import('@vueda/use/useSlotNameResolver.js').ResolvedSlotName}} resolvedSlotNames - The resolved slot
 *  name instances by original slot name.
 * @property {BoundDoCreate} doCreate - The method to create a new object in the fieldset.
 * @property {() => {[fieldName: string]: any}} getEmptyFieldObject - Returns an empty object with initial values for each field.
 * @property {BoundHandleSelected} handleSelected - The method to handle selected items.
 * @property {BoundRefFn} refFn - The method to add a reference to an item.
 * @property {BoundRemoveObject} removeObject - The method to remove an object from the fieldset.
 * @property {(visible: boolean) => void} setVisibility - Set visibility, emitting update:visible when controlled.
 * @property {BoundToggleVisibility} toggleVisibility - The method to toggle the visibility of the fieldset.
 */

/**
 * Composable for handling tabular inline fieldset logic.
 *
 * @param {FieldSetInlineOptions} options - Options containing props, emit, and slotNames.
 * @returns {FieldSetInlineInstance} An object containing reactive state, computed properties, and methods
 * to manage the tabular inline fieldset.
 */
export function useFieldSetInline({ props, emit, slotNames, fieldSetContext, addDestroyAction = false }) {
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
        fields: computed(() => [...(deepUnref(parentFormModel.fields) || []), ...(props.fields || [])]),
        expand: computed(() => [...(deepUnref(parentFormModel.expand) || []), ...(props.expand || [])]),
        fieldDetails: computed(() => merge(cloneDeep(parentFormModel.fieldDetails), props.fieldDetails)),
        fieldComponents: computed(() => merge(cloneDeep(parentFormModel.fieldComponents), props.fieldComponents)),
        fieldProps: computed(() => merge(cloneDeep(parentFormModel.fieldProps), props.fieldProps)),
        expandDetails: computed(() => merge(cloneDeep(parentFormModel.expandDetails), props.expandDetails)),
        widgetComponents: computed(() => merge(cloneDeep(parentFormModel.widgetComponents), props.widgetComponents)),
        widgetProps: computed(() => merge(cloneDeep(parentFormModel.widgetProps), props.widgetProps)),
    });
    const formModel = useFormModel(mergedFormModelProps);
    /** @type {import('@vueda/use/useForm.js').FormContext|null} */
    const providedFormContext = inject(FormContextSymbol, null);
    const formContext = computed(() => (props.contextless ? null : unref(providedFormContext)));

    /** @type {FieldSetInlineState} */
    const state = reactive(
        /** @type {FieldSetInlineRawState} */
        {
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
                const actions = state.fieldObjects.filter((field) => field.action);
                const readOnly =
                    props.readOnly ||
                    props.fieldProps?.readOnly ||
                    formModel.fieldProps?.[fieldSetContext.state.formModelName]?.readOnly ||
                    parentFormModel.view === "read";
                if (readOnly) {
                    return actions.filter((action) => action.fieldName !== "destroy");
                }
                // Nested updates delete omitted children through the parent, without a child destroy route.
                if (addDestroyAction && !actions.some((action) => action.fieldName === "destroy")) {
                    actions.push({
                        fieldName: "destroy",
                        name: `${fieldSetContext.state.formModelName}.destroy`,
                        action: true,
                        label: "Delete",
                    });
                }
                return actions;
            }),
            fieldNames: computed(() => {
                const prefix = `${fieldSetContext.state.formModelName}.`;

                if (props.fields) {
                    return props.fields.reduce((acc, fullFieldName) => {
                        if (fullFieldName?.startsWith?.(prefix)) {
                            acc.push(fullFieldName.slice(prefix.length));
                        }
                        return acc;
                    }, []);
                }
                const hidden = formModel?.expandDetails?.[fieldSetContext.state.formModelName]?.hidden || [];

                // noinspection JSValidateTypes,JSCheckFunctionSignatures
                /** @type {string[]} */
                const unwrappedFields = deepUnref(formModel.fields);

                const reduced = unwrappedFields.reduce((acc, fullFieldName) => {
                    if (fullFieldName?.startsWith?.(prefix)) {
                        const field = fullFieldName.slice(prefix.length);
                        if (!hidden.includes(field)) {
                            acc.push(field);
                        }
                    }
                    return acc;
                }, []);

                if (reduced.length) {
                    return reduced;
                }

                const fields = formModel?.expandDetails?.[fieldSetContext.state.formModelName]?.f;
                const omitFields = formModel?.expandDetails?.[fieldSetContext.state.formModelName]?.hidden;
                return fields ? Object.keys(omit(fields, omitFields)) : [];
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
                              name: `${fieldSetContext.state.formModelName}.${name}`,
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
                ];
                return slotNames.filter((slotName) => !knownSlotNames.includes(slotName));
            }),
        },
    );
    state.greaterOrEqualHiddenBreakpoint = breakpoints.greaterOrEqual(toRef(state, "hiddenByDefault"));

    watch(
        () => fieldSetContext.state.initialValue,
        () => {
            for (const rowIndex of [...state.selected]) {
                handleSelected(state, fieldSetContext, false, rowIndex);
            }
        },
        { deep: true },
    );

    watch(
        [toRef(state, "itemRefs"), toRef(state, "focusIndex")],
        ([newItemRefs, newFocusIndex]) => {
            const newItem = newItemRefs?.find?.((el) => Number(el?.dataset?.rowIndex) === newFocusIndex);
            if (newItem) {
                newItem.scrollIntoView({ behavior: "smooth", block: "center" });
                focusFirstTabbableElement(newItem.parentNode);
                state.focusIndex = null;
            }
        },
        { deep: true, flush: "post" },
    );
    watch(
        [toRef(state, "visible"), toRef(state, "hidable"), toRef(state, "isVisibleByDefault")],
        ([visible, hidable, defaultVisible]) => {
            if (visible !== undefined) {
                state.internalVisible = visible;
            } else if (hidable === false) {
                state.internalVisible = true;
            } else if (!state.userHasToggled) {
                state.internalVisible = defaultVisible;
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
            if (!state.internalVisible) {
                setVisibility(state, emit, true);
            }
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
        removeObject: (index) => removeObject(state, fieldSetContext, formContext.value, index),
        setVisibility: (visible) => setVisibility(state, emit, visible),
        toggleVisibility: () => {
            setVisibility(state, emit, !state.internalVisible);
        },
    };
}
