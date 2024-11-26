<script setup>
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
import { getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import { useBreakpoints } from "@vueuse/core";
import { merge } from "lodash-es";
import cloneDeep from "lodash-es/cloneDeep.js";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import Divider from "primevue/divider";
import { computed, inject, nextTick, reactive, ref, shallowReactive, unref, useSlots, watch } from "vue";

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
    extraFieldObjects: {
        type: Array,
        default: () => [
            {
                name: `delete_`,
                extra: true,
                label: "Delete?",
                action: true,
            },
        ],
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
const itemRefs = ref({});
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

const formModel = useFormModel("FieldSetTabularInline", mergedFormModelProps);
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
const onCreate = () => {
    fieldSetContext.blur();
    fieldSetContext.state.value = [...cloneDeep(fieldSetContext.state.value), emptyFieldObject()];
    nextTick(() => {
        const newItemIndex = fieldSetContext.state.value.length - 1;
        if (itemRefs.value[newItemIndex]) {
            itemRefs.value[newItemIndex].scrollIntoView({ behavior: "smooth", block: "center" });
        }
    });
};

const handleSelected = (newSelected) => {
    const added = newSelected.filter((i) => !selected.value.includes(i));
    const removed = selected.value.filter((i) => !newSelected.includes(i));
    added.forEach((i) => {
        fieldSetContext.ignore(`${fieldSetContext.state.name}[${i}]`);
    });
    removed.forEach((i) => {
        fieldSetContext.removeIgnore(`${fieldSetContext.state.name}[${i}]`);
    });
    selected.value = newSelected;
    if (newSelected.length) {
        fieldSetContext.setModified();
    } else {
        fieldSetContext.clearModified();
    }
};

const removeObject = (index) => {
    fieldSetContext.blur();
    fieldSetContext.state.value = cloneDeep(fieldSetContext.state.value).filter((_, i) => i !== index);
};
const objectsInOrder = computed(() => fieldSetContext.state.value);
const computedFieldProps = computed(() =>
    merge(formModel.fieldProps[fieldSetContext.state.formModelName], props.fieldProps),
);
const computedFieldObjects = computed(() => {
    const objects = [...fieldObjects.value, ...props.extraFieldObjects];
    if (computedFieldProps.value.readOnly) {
        return objects?.filter((field) => !field.action);
    }
    return objects;
});
const calculatedObjects = computed(() => formModel.fieldProps[fieldSetContext.state.formModelName]?.calculatedObjects);
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
const refFn = (slotProps, el) => {
    if (!itemRefs.value) {
        itemRefs.value = [];
    }
    itemRefs.value[slotProps.rowIndex] = el;
};
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
const theme = useTheme("FieldSetTabularInline", props);
const slotNames = ["toggle-button", "create-button", "delete-button", "delete-checkbox"];
const resolvedSlotNames = slotNames.reduce((acc, name) => {
    acc[name] = useSlotNameResolver(
        computed(() => [
            `field(${fieldSetContext.state.formModelName})${name}`,
            `field(${fieldSetContext.state.formModelName})`,
            `fieldset-${name}`,
            name,
        ]),
    );
    return acc;
}, {});
const remainingSlotNames = computed(() => {
    const slotNames = Object.keys(slots);
    const knownSlotNames = [
        "default",
        ...slotNames.flatMap((name) => unref(resolvedSlotNames?.[name]?.possibleNames)),
        ...getFormChoresSlotNames(fieldSetContext.state.formModelName),
    ];
    return slotNames.filter((slotName) => !knownSlotNames.includes(slotName));
});
</script>

<template>
    <div :class="[theme('root'), $attrs.class]" data-qa="fieldset-tabular-inline-root">
        <div :class="theme('inner')" data-qa="fieldset-tabular-inline-inner">
            <Divider
                align="left"
                :pt="{
                    content: {
                        class: 'flex flex-row items-baseline justify-between gap-1 md:gap-2 2xl:gap-4 !bg-zinc-100 dark:!bg-zinc-800',
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
                        @click="onCreate"
                    >
                        <Button :class="theme('createButton')" label="Create" @click="onCreate" />
                    </slot>
                </div>
            </Divider>
            <slot name="field-set-level-chores" :theme-override="themeOverride">
                <form-chores :theme-override="themeOverride" :variant="null">
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
                :calculated-objects="calculatedObjects"
                :class="[theme('objectsGrid'), $attrs.class]"
                data-qa="fieldset-tabular-inline-objects-grid"
                :empty-text="null"
                :field-classes="{
                    selected_: 'text-center',
                }"
                :fields="computedFieldObjects"
                :objects-in-order="objectsInOrder"
                :table-breakpoint="$attrs.tableBreakpoint || 'lg'"
                :theme-override="{ ...themeOverride, ObjectsGridBodyCell: { root: { class: 'min-w-36' } } }"
                :variant="props.objectGridVariant"
            >
                <template
                    v-for="fieldObj in fieldObjects"
                    :key="fieldObj.name"
                    #[`header(${fieldObj.name})`]="headerSlotProps"
                >
                    <slot :name="`header(${fieldObj.name})`" v-bind="headerSlotProps"></slot>
                </template>
                <template
                    v-for="fieldObj in fieldObjects"
                    :key="`${fieldObj.name}-${objectGridFieldSlotProps.rowIndex}-${objectGridFieldSlotProps.colIndex}`"
                    #[`field(${fieldObj.name})`]="objectGridFieldSlotProps"
                >
                    <a
                        data-qa="fieldset-tabular-inline-anchor"
                        v-if="objectGridFieldSlotProps.colIndex === 0"
                        :ref="(el) => refFn(objectGridFieldSlotProps, el)"
                        :id="`fieldset-tabular-inline-anchor-${fieldObj.name}-${objectGridFieldSlotProps.rowIndex}`"
                    />
                    <field-renderer
                        :form-model-name="fieldObj.name"
                        :field-props="computedFieldProps"
                        :form-model="formModel"
                        :field-set-context="fieldSetContext"
                        :object-grid-field-slot-props="objectGridFieldSlotProps"
                    >
                        <template v-for="slotName in remainingSlotNames" #[slotName]="slotProps">
                            <slot :name="slotName" v-bind="slotProps" />
                        </template>
                    </field-renderer>
                </template>
                <template v-for="field in extraFieldObjects" :key="field.name" #[`field(${field.name})`]="slotProps">
                    <slot
                        v-if="!slotProps.pk"
                        :field-class="theme('field')"
                        :field-props="computedFieldProps"
                        :label="field.label"
                        :name="resolvedSlotNames['delete-button'].name"
                        :theme="theme"
                        :value="field.value"
                        verb="delete"
                        @click="removeObject(slotProps.rowIndex)"
                        @selected="handleSelected"
                    >
                        <Button label="Delete" text @click="removeObject(slotProps.rowIndex)"></Button>
                    </slot>
                    <slot
                        v-else
                        :field-class="theme('field')"
                        :field-props="computedFieldProps"
                        :label="field.label"
                        :name="resolvedSlotNames['delete-checkbox'].name"
                        :theme="theme"
                        :value="field.value"
                        verb="delete"
                        @click="removeObject(slotProps.rowIndex)"
                        @selected="handleSelected"
                    >
                        <Checkbox
                            :input-id="`selected-row-${slotProps.rowIndex}`"
                            :model-value="selected"
                            name="delete-checkbox"
                            :value="slotProps.rowIndex"
                            @update:model-value="handleSelected"
                        />
                    </slot>
                </template>
            </objects-grid>
        </div>
    </div>
</template>
