/**
 * @module use/useFieldRenderer
 * @description Computes the resolved components, props, slot names, and theme for rendering a field and widget pair inside a FieldRenderer component.
 */
import { mergeTheme } from "@vueda/use/useTheme.js";
import { availableWidgets } from "@vueda/utils/formLookups.js";
import omit from "lodash-es/omit.js";
import { computed, effectScope, markRaw, shallowReadonly, unref } from "vue";

/**
 * @typedef {object} FieldRendererProps
 * @property {string} formModelName - The fully-qualified name of the field in the form model.
 * @property {import('@vueda/use/useFormModel.js').UseFormModelState} formModel - The reactive form model instance.
 * @property {{ [key: string]: unknown }} [objectGridFieldSlotProps] - Slot props passed from an ObjectGrid when rendering inline.
 * @property {{ [key: string]: unknown }} [fieldsetStackedInlineProps] - Slot props used for stacked inline rendering.
 * @property {{ [key: string]: unknown }} [fieldProps] - Additional field-level props.
 * @property {boolean} [hidden] - Whether to hide the widget from rendering.
 * @property {boolean} isFilter - Whether to this was used with a filter model.
 */

/**
 * @typedef {object} FieldRendererRawInstance
 * @property {import('vue').ComputedRef<import('vue').ComponentInternalInstance>} fieldComponent - The field component.
 * @property {import('vue').ComputedRef<import('vue').ComponentInternalInstance>} widgetComponent - The widget component.
 * @property {import('vue').ComputedRef<string>} fieldSlotName - The field slot name.
 * @property {import('vue').ComputedRef<string>} widgetSlotName - The widget slot name.
 * @property {import('vue').ComputedRef<{ [key: string]: unknown }>} fieldProps - The field props.
 * @property {import('vue').ComputedRef<{ [key: string]: unknown }>} widgetProps - The widget props.
 * @property {import('vue').ComputedRef<{ [key: string]: unknown }>} fieldDetail - The field detail.
 * @property {import('vue').ComputedRef<string>} fieldValuePath - The field value path.
 * @property {import('vue').ComputedRef<string>} fieldDefaultSlotName - The field default slot name.
 * @property {import('vue').ComputedRef<string>} widgetDefaultSlotName - The widget default slot name.
 * @property {import('vue').ComputedRef<string[]>} remainingSlots - The remaining slots.
 * @property {() => void} stop - A function to stop the effect scope.
 */

/**
 * A helper composable that computes the derived props and metadata needed to render a field & widget pair,
 *  via FieldRenderer.
 *
 * This composable abstracts out logic around:
 *  - Slot scoping (e.g. field(x), widget(y), default)
 *  - Widget and field component resolution
 *  - Prop merging across field context, object-grid slots, and attribute passthrough
 *  - Theme resolution for `themeOverride` values
 *  - Auto-naming the field input for context or standalone usage
 *
 * @param {FieldRendererProps} props - The props from the FieldRenderer component.
 * @param {{ [key: string]: any }} attrs - Raw `useAttrs()` output (e.g. class, id, etc.).
 * @param {import('vue').Slots} slots - Raw `useSlots()` output, for detecting scoped slot names.
 * @param {FieldContext | null} [fieldSetContext] - The injected field context if inside a fieldset; used to compute full path names.
 * @returns {import('vue').Readonly<FieldRendererRawInstance>} - The reactive field renderer instance.
 */
export function useFieldRenderer(props, attrs, slots, fieldSetContext) {
    const es = effectScope();
    return es.run(() => {
        const relativeFieldName = computed(() =>
            !fieldSetContext ? props.formModelName : props.formModelName.replace(`${fieldSetContext.state.name}__`, ""),
        );
        const fieldValuePath = computed(() => {
            if (!fieldSetContext) {
                return props.formModelName;
            } else {
                if (props.objectGridFieldSlotProps.rowIndex !== undefined) {
                    return `${fieldSetContext.state.name}[${props.objectGridFieldSlotProps.rowIndex}].${unref(relativeFieldName)}`;
                } else if (props.fieldsetStackedInlineProps.index !== undefined) {
                    return `${fieldSetContext.state.name}[${props.fieldsetStackedInlineProps.index}].${unref(relativeFieldName)}`;
                }
            }
            return `${fieldSetContext.state.name}.${unref(relativeFieldName)}`;
        });
        const fieldSlotName = computed(() => `${props.isFilter ? "filter-" : ""}field(${props.formModelName})`);
        const fieldDefaultSlotName = computed(() => `${unref(fieldSlotName)}default`);
        const widgetSlotName = computed(() => `${props.isFilter ? "filter-" : ""}widget(${props.formModelName})`);
        const widgetDefaultSlotName = computed(() => `${unref(widgetSlotName)}default`);
        const knownSlots = computed(() => [
            unref(fieldSlotName),
            unref(fieldDefaultSlotName),
            unref(widgetSlotName),
            unref(widgetDefaultSlotName),
            "default",
        ]);
        const remainingSlots = computed(() =>
            Object.keys(slots).filter((slotName) => !unref(knownSlots).includes(slotName)),
        );
        const fieldComponent = computed(() => markRaw(props.formModel.fieldComponents[props.formModelName]));
        const widgetComponent = computed(() =>
            markRaw(props.formModel.widgetComponents[props.formModelName] ?? availableWidgets.WidgetUnmapped),
        );
        const fieldDetail = computed(() =>
            props.isFilter
                ? props.formModel.filterableDetails[props.formModelName]
                : props.formModel.fieldDetails[props.formModelName],
        );
        const computedHidden = computed(() => {
            if (props.hidden !== undefined) {
                return props.hidden;
            }
            return !!fieldSetContext;
        });
        const fieldProps = computed(() => ({
            ...omit(props.objectGridFieldSlotProps, ["value"]),
            ...omit(props.formModel.fieldProps[props.formModelName], ["themeOverride"]),
            ...omit(attrs, ["class"]),
            name: unref(fieldValuePath),
            formModelName: props.formModelName,
            modelValue: props.objectGridFieldSlotProps?.value,
            hidden: computedHidden.value,
            themeOverride: mergeTheme(
                props.formModel.fieldProps[props.formModelName]?.themeOverride,
                props.themeOverride,
            ),
        }));
        const widgetProps = computed(() => ({
            ...props.objectGridFieldSlotProps,
            ...omit(props.formModel.widgetProps[props.formModelName], ["themeOverride"]),
            ...omit(attrs, ["class"]),
            ...props.widgetProps,
            themeOverride: mergeTheme(
                props.formModel.fieldProps[props.formModelName]?.themeOverride,
                props.formModel.widgetProps[props.formModelName]?.themeOverride,
                props.themeOverride,
            ),
        }));
        const slotsForPassing = computed(() => unref(remainingSlots).map((slotName) => [slotName, slots[slotName]]));
        return shallowReadonly({
            fieldComponent,
            widgetComponent,
            fieldSlotName,
            widgetSlotName,
            fieldProps,
            widgetProps,
            fieldDetail,
            slotsForPassing,
            fieldValuePath,
            fieldDefaultSlotName,
            widgetDefaultSlotName,
            remainingSlots,
            stop: () => {
                es.stop();
            },
        });
    });
}
