<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import FieldRenderer from "@vueda/components/FieldRenderer.vue";
import FormChores from "@vueda/components/FormChores.vue";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useFormModel } from "@vueda/use/useFormModel.js";
import { getFieldInitialValue } from "@vueda/use/useModelInitialValues.js";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { breakpointsVueda } from "@vueda/utils/breakpoints.js";
import { getFormChoresSlotNames } from "@vueda/utils/buildForm.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import WidgetCheckbox from "@vueda/widgets/WidgetCheckbox.vue";
import { useBreakpoints } from "@vueuse/core";
import { merge } from "lodash-es";
import cloneDeep from "lodash-es/cloneDeep.js";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import Divider from "primevue/divider";
import { computed, inject, onBeforeUpdate, reactive, ref, shallowReactive, unref, useSlots, watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
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
    objectGridVariant: {
        type: String,
        default: "default",
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
});
const itemRefs = ref(null);
onBeforeUpdate(() => {
    itemRefs.value = null;
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldSetContext = useField(props, emit);
const parentFormModel = inject(FormModelSymbol, null);

// merge the props from FieldSetTabularInline, and the props from the formModel
const mergedFormModelProps = reactive({
    name: props.name,
    app: parentFormModel.app,
    model: parentFormModel.model,
    view: parentFormModel.view,
    fields: computed(() => [...(parentFormModel.fields?.map((item) => item.value) || []), ...(props.fields || [])])
        .value,
    expands: computed(() => [...(parentFormModel.expands?.map((item) => item.value) || []), ...(props.expands || [])])
        .value,
    fieldDetails: shallowReactive(merge(cloneDeep(parentFormModel.fieldDetails), props.fieldDetails)),
    fieldComponents: shallowReactive(merge(cloneDeep(parentFormModel.fieldComponents), props.fieldComponents)),
    fieldProps: shallowReactive(merge(cloneDeep(parentFormModel.fieldProps), props.fieldProps)),
    expandDetails: shallowReactive(merge(cloneDeep(parentFormModel.expandDetails), props.expandDetails)),
    widgetComponents: shallowReactive(merge(cloneDeep(parentFormModel.widgetComponents), props.widgetComponents)),
    widgetProps: shallowReactive(merge(cloneDeep(parentFormModel.widgetProps), props.widgetProps)),
});

const theme = useTheme("FieldSetTabularInline", props);
const formModel = useFormModel(mergedFormModelProps);
const fieldNames = computed(() => {
    if (props.fields) {
        return props.fields;
    } else {
        const fields = formModel?.expandDetails?.[fieldSetContext.state.formModelName]?.f;
        const omitFields = formModel?.expandDetails?.[fieldSetContext.state.formModelName].hidden;
        // return the fields keys, omitting the hidden fields keys
        return fields ? Object.keys(omit(fields, omitFields)) : [];
    }
});

const fieldObjects = computed(() => {
    if (props.fieldObjects) {
        return props.fieldObjects;
    }
    const fields = formModel?.expandDetails?.[fieldSetContext.state.formModelName]?.f;
    return fields
        ? fieldNames.value?.map((name) => {
              return {
                  fieldName: name,
                  name: `${fieldSetContext.state.formModelName}__${name}`,
                  ...fields[name],
              };
          })
        : [];
});

const emptyFieldObject = () => {
    const emptyObject = {};
    if (Array.isArray(fieldObjects.value)) {
        fieldObjects.value.forEach((field) => {
            if (field.fieldName) {
                emptyObject[field.fieldName] = getFieldInitialValue(field);
            }
        });
    }
    return emptyObject;
};

const selected = ref([]);

function focusFirstTabbableElement(element) {
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
}

const focusIndex = ref(null);
watch(
    [itemRefs, focusIndex],
    ([newItemRefs, newFocusIndex]) => {
        // noinspection EqualityComparisonWithCoercionJS
        const newItem = newItemRefs?.find?.((el) => el.dataset.rowIndex == newFocusIndex);
        if (newItem) {
            newItem.scrollIntoView({ behavior: "smooth", block: "center" });
            focusFirstTabbableElement(newItem.parentNode);
            focusIndex.value = null;
        }
    },
    { deep: true, flush: "post" },
);
const doCreate = (_e, defaultValues) => {
    if (!defaultValues) {
        defaultValues = emptyFieldObject();
    }
    fieldSetContext.blur();
    fieldSetContext.state.value = [...cloneDeep(fieldSetContext.state.value), defaultValues];
    focusIndex.value = fieldSetContext.state.value.length - 1;
};

const handleSelected = (isSelected, rowIndex) => {
    if (isSelected) {
        if (!selected.value.includes(rowIndex)) {
            selected.value.push(rowIndex);
            fieldSetContext.ignore(`${fieldSetContext.state.name}[${rowIndex}]`);
        }
    } else {
        selected.value = selected.value.filter((i) => i !== rowIndex);
        fieldSetContext.removeIgnore(`${fieldSetContext.state.name}[${rowIndex}]`);
    }
    if (selected.value.length) {
        fieldSetContext.setModified();
    } else {
        fieldSetContext.clearModified();
    }
};

const removeObject = (index) => {
    fieldSetContext.blur();
    fieldSetContext.state.value = cloneDeep(fieldSetContext.state.value).filter((_, i) => i !== index);
};
const computedFieldProps = computed(() =>
    merge(formModel.fieldProps[fieldSetContext.state.formModelName], props.fieldProps),
);
const computedFieldObjects = computed(() => {
    const objects = [];
    if (actions.value.length) {
        objects.push({
            name: "item-action-bar",
        });
    }
    objects.push(...fieldObjects.value);
    return objects.filter((field) => !field.action);
});
const actions = computed(() => {
    return [...fieldObjects.value].filter((field) => field.action);
});
const breakpoints = useBreakpoints(breakpointsVueda);
const isVisibleByDefault = computed(() => {
    if (props.hiddenByDefault === "always") {
        return false;
    } else if (props.hiddenByDefault === "never") {
        return true;
    } else if (Object.keys(breakpointsVueda).includes(props.hiddenByDefault)) {
        return breakpoints.greaterOrEqual(props.hiddenByDefault).value;
    }
    return true;
});

const userHasToggled = ref(false);
const internalVisible = ref(props.visible ?? isVisibleByDefault.value);

watch(
    () => props.visible,
    (newVal) => {
        if (newVal !== undefined) {
            internalVisible.value = newVal;
        }
    },
    { immediate: true },
);

watch(isVisibleByDefault, (newVal) => {
    if (!userHasToggled.value && props.visible === undefined) {
        internalVisible.value = newVal;
    }
});

const toggleVisibility = () => {
    if (props.visible !== undefined) {
        emit("update:visible", !internalVisible.value);
    } else {
        internalVisible.value = !internalVisible.value;
    }
    userHasToggled.value = true;
};
const refFn = (el) => {
    if (!itemRefs.value) {
        itemRefs.value = [];
    }
    itemRefs.value.push(el);
};
const slots = useSlots();
const slotNames = [
    "toggle-button",
    "create-button",
    "delete-button",
    "delete-checkbox",
    // todo: implement action-button for non item actions
    // "action-button",
    "item-action-button",
];
const resolvedSlotNames = slotNames.reduce((acc, name) => {
    acc[name] = useSlotNameResolver(
        computed(() => [`field(${fieldSetContext.state.formModelName})${name}`, `fieldset-${name}`, name]),
    );
    return acc;
}, {});
const remainingSlotNames = computed(() => {
    const slotNames = Object.keys(slots);
    const knownSlotNames = [
        "default",
        `field(${fieldSetContext.state.formModelName})item-action-bar`,
        ...slotNames.flatMap((name) => unref(resolvedSlotNames?.[name]?.possibleNames)),
        ...getFormChoresSlotNames(fieldSetContext.state.formModelName),
    ];
    return slotNames.filter((slotName) => !knownSlotNames.includes(slotName));
});
</script>

<template>
    <div ref="test" :class="combineClasses(theme('root'), $attrs.class)" data-qa="fieldset-tabular-inline-root">
        <div :class="theme('inner')" data-qa="fieldset-tabular-inline-inner">
            <Divider
                :pt="{
                    content: {
                        class: theme('dividerContent'),
                    },
                }"
            >
                <div v-if="hidable" data-qa="fieldset-tabular-inline-header-toggle">
                    <slot
                        :class="theme('toggleButton')"
                        :field-props="computedFieldProps"
                        :label="internalVisible ? 'Hide' : 'Show'"
                        :name="resolvedSlotNames['toggle-button'].name"
                        :verb="internalVisible ? 'collapseDown' : 'collapseUp'"
                        @click="toggleVisibility"
                    >
                        <Button
                            :class="theme('toggleButton')"
                            :label="internalVisible ? 'Hide' : 'Show'"
                            @click="toggleVisibility"
                        />
                    </slot>
                </div>
                <div :class="theme('title')" data-qa="fieldset-tabular-inline-title">
                    <slot name="title">
                        {{ fieldSetContext.state.label }}
                    </slot>
                </div>
                <div :class="theme('actionBar')" data-qa="fieldset-tabular-inline-action-bar">
                    <slot
                        v-if="!computedFieldProps.readOnly && props.showCreateButton"
                        :class="theme('createButton')"
                        :field-props="computedFieldProps"
                        label="Create"
                        :name="resolvedSlotNames['create-button'].name"
                        verb="createInline"
                        @click="doCreate"
                    >
                        <Button :class="theme('createButton')" label="Create" @click="doCreate" />
                    </slot>
                </div>
            </Divider>
            <slot name="field-set-level-chores">
                <form-chores :variant="null">
                    <template
                        v-for="slot in getFormChoresSlotNames(fieldSetContext.state.formModelName)"
                        #[slot]="formChoresSlotProps"
                    >
                        <slot :name="slot" v-bind="formChoresSlotProps" />
                    </template>
                </form-chores>
            </slot>
            <objects-grid
                v-if="internalVisible"
                :calculated-objects="$attrs.calculatedObjects || {}"
                :class="theme('objectsGrid')"
                data-qa="fieldset-tabular-inline-objects-grid"
                :empty-text="null"
                :field-classes="{
                    selected_: 'text-center',
                }"
                :fields="computedFieldObjects"
                :objects-in-order="fieldSetContext.state.value"
                :table-breakpoint="$attrs.tableBreakpoint || 'lg'"
                :theme-override="{ ObjectsGridBodyCell: { root: { class: 'min-w-36' } } }"
                :variant="props.objectGridVariant"
            >
                <template
                    v-for="fieldObj in fieldObjects"
                    :key="fieldObj.name"
                    #[`header(${fieldObj.name})`]="headerSlotProps"
                >
                    <slot :name="`header(${fieldObj.name})`" v-bind="headerSlotProps"></slot>
                </template>
                <template #[`field(item-action-bar)`]="objectGridFieldSlotProps">
                    <slot name="item-action-bar">
                        <div
                            v-if="actions?.length"
                            :class="theme('itemActionBar')"
                            data-qa="field-set-tabular-inline-item-action-bar"
                        >
                            <template v-for="action in actions">
                                <template v-if="action.fieldName === 'delete'">
                                    <slot
                                        v-if="!objectGridFieldSlotProps.pk"
                                        :action="action"
                                        :label="action.label"
                                        :name="resolvedSlotNames['delete-button'].name"
                                        :row-index="objectGridFieldSlotProps.rowIndex"
                                        :selected="selected.includes(objectGridFieldSlotProps.rowIndex)"
                                        :theme="theme"
                                        :value="action.value"
                                        verb="delete"
                                        @click="removeObject(objectGridFieldSlotProps.rowIndex)"
                                    >
                                        <Button
                                            label="Delete"
                                            text
                                            @click="removeObject(objectGridFieldSlotProps.rowIndex)"
                                        />
                                    </slot>
                                    <slot
                                        v-else
                                        :action="action"
                                        :contextless="true"
                                        label="Delete?"
                                        :model-value="selected.includes(objectGridFieldSlotProps.rowIndex)"
                                        :name="resolvedSlotNames['delete-checkbox'].name"
                                        :required="false"
                                        :row-index="objectGridFieldSlotProps.rowIndex"
                                        :theme="theme"
                                        :value="action.value"
                                        verb="delete"
                                        @update:model-value="
                                            (isSelected) =>
                                                handleSelected(isSelected, objectGridFieldSlotProps.rowIndex)
                                        "
                                    >
                                        <widget-checkbox
                                            :contextless="true"
                                            :input-id="`selected-row-${objectGridFieldSlotProps.rowIndex}`"
                                            label="Delete?"
                                            :model-value="selected.includes(objectGridFieldSlotProps.rowIndex)"
                                            name="delete-checkbox"
                                            :required="false"
                                            size="small"
                                            :value="objectGridFieldSlotProps.rowIndex"
                                            @update:model-value="
                                                (isSelected) =>
                                                    handleSelected(isSelected, objectGridFieldSlotProps.rowIndex)
                                            "
                                        />
                                    </slot>
                                </template>
                                <template v-else>
                                    <slot
                                        :name="resolvedSlotNames['item-action-button'].name"
                                        v-bind="{
                                            objectGridFieldSlotProps,
                                            action,
                                            fieldSetContextState: fieldSetContext.state,
                                            rowValueName: `${fieldSetContext.state.name}[${objectGridFieldSlotProps.rowIndex}]`,
                                            doCreate,
                                        }"
                                    >
                                        <Button
                                            :label="action.label"
                                            @click="
                                                ($event) =>
                                                    action.action({
                                                        objectGridFieldSlotProps,
                                                        action,
                                                        fieldSetContextState: fieldSetContext.state,
                                                        rowValueName: `${fieldSetContext.state.name}[${objectGridFieldSlotProps.rowIndex}]`,
                                                        event: $event,
                                                        doCreate,
                                                    })
                                            "
                                        />
                                    </slot>
                                </template>
                            </template>
                        </div>
                    </slot>
                </template>
                <template
                    v-for="(fieldObj, foIndex) in fieldObjects"
                    :key="`${fieldObj.name}-${objectGridFieldSlotProps.rowIndex}-${objectGridFieldSlotProps.colIndex}`"
                    #[`field(${fieldObj.name})`]="objectGridFieldSlotProps"
                >
                    <a
                        v-if="foIndex === 0"
                        :id="`fieldset-tabular-inline-anchor-${fieldObj.name}-${objectGridFieldSlotProps.rowIndex}`"
                        :ref="(el) => refFn(el)"
                        data-qa="fieldset-tabular-inline-anchor"
                        :data-row-index="objectGridFieldSlotProps.rowIndex"
                    />
                    <field-renderer
                        :field-props="computedFieldProps"
                        :form-model="formModel"
                        :form-model-name="fieldObj.name"
                        :object-grid-field-slot-props="objectGridFieldSlotProps"
                        v-bind="{ doCreate }"
                    >
                        <template v-for="slotName in remainingSlotNames" #[slotName]="slotProps">
                            <slot :name="slotName" v-bind="slotProps" />
                        </template>
                    </field-renderer>
                </template>
            </objects-grid>
        </div>
    </div>
</template>
