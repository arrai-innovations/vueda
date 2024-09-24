<script setup>
import FormChores from "@vueda/components/FormChores.vue";
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { getFieldInitialValue } from "@vueda/use/useModelInitialValues.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import { computed, inject, ref } from "vue";

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
    objectGridVariant: {
        type: String,
        default: "default",
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const formModel = inject(FormModelSymbol, null);
const fieldNames = computed(() => {
    if (props.fields) {
        return props.fields;
    } else {
        //TODO: prob needs to ignore ID for display fields
        const fields = formModel?.expandDetails?.[fieldContext.state.name].f;
        return fields ? Object.keys(omit(fields, "id")) : [];
    }
});

const fieldObjects = computed(() => {
    const fields = formModel?.expandDetails?.[fieldContext.state.name].f;

    return fields
        ? fieldNames.value?.map((name) => {
              return {
                  fieldName: name,
                  name: `${fieldContext.state.name}__${name}`,
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
const theme = useTheme("FieldSetTabularInline");
const onAdd = () => {
    fieldContext.blur();
    fieldContext.state.value = [...cloneDeep(fieldContext.state.value), emptyFieldObject()];
};

const handleSelected = (selected_) => {
    const added = selected_.filter((i) => !selected.value.includes(i));
    const removed = selected.value.filter((i) => !selected_.includes(i));
    added.forEach((i) => {
        const index = fieldContext.state.value.findIndex((obj) => obj.id === i);
        fieldContext.ignore(`${fieldContext.state.name}[${index}]`);
    });
    removed.forEach((i) => {
        const index = fieldContext.state.value.findIndex((obj) => obj.id === i);
        fieldContext.removeIgnore(`${fieldContext.state.name}[${index}]`);
    });
    selected.value = selected_;
    if (selected_.length) {
        fieldContext.setModified();
    } else {
        fieldContext.clearModified();
    }
};

const removeObject = (index) => {
    fieldContext.blur();
    fieldContext.state.value = cloneDeep(fieldContext.state.value).filter((_, i) => i !== index);
};
const objectsInOrder = computed(() => {
    return fieldContext.state.value;
});
</script>

<template>
    <div :class="theme('root')" data-qa="fieldset-tabular-inline">
        <div :class="theme('inner')">
            <label :class="theme('label')" :for="fieldContext.state.name">
                <slot name="label">
                    {{ fieldContext.state.label }}
                </slot>
            </label>
            <form-chores />
            <hr :class="theme('hr')" />
            <objects-grid
                v-bind="$attrs"
                class="w-full"
                data-qa="fieldset-tabular-inline-objects-grid"
                :empty-text="null"
                :fields="fieldObjects"
                :objects-in-order="objectsInOrder"
                selectable
                :selected="selected"
                table-breakpoint="lg"
                :variant="props.objectGridVariant"
                @update:selected="handleSelected"
            >
                <template #header(selected_)> Delete? </template>
                <template v-for="(obj, rowIndex) in objectsInOrder" :key="obj.id" #[`field(selected_)${rowIndex}`]>
                    <Button v-if="!obj.id" label="delete" text @click="removeObject(rowIndex)"></Button>
                </template>

                <template v-for="field in fieldObjects" :key="field.name" #[`field(${field.name})`]="slotProps">
                    <slot
                        :field-class="theme('field')"
                        :field-component="formModel.fieldComponents[field.name]"
                        :field-detail="formModel.fieldDetails[field.name]"
                        :field-inner-class="theme('fieldInner')"
                        :field-props="{
                            ...formModel.fieldProps[field.name],
                            name: `${fieldContext.state.name}[${slotProps.rowIndex}].${field.fieldName}`,
                        }"
                        :name="`field(${field.name})`"
                        :theme="theme"
                        :widget-component="formModel.widgetComponents[field.name]"
                        :widget-props="{ ...formModel.widgetProps[field.name], hidden: true }"
                    >
                        <component
                            :is="formModel.fieldComponents[field.name]"
                            v-if="formModel.fieldComponents[field.name]"
                            :class="theme('field')"
                            v-bind="formModel.fieldProps[field.name]"
                            :name="`${fieldContext.state.name}[${slotProps.rowIndex}].${field.fieldName}`"
                        >
                            <div :class="theme('fieldInner')">
                                <slot
                                    :field-object="formModel.fieldDetails[field.name]"
                                    :name="`widget(${field.name})`"
                                    :theme="theme"
                                    :widget-component="formModel.widgetComponents[field.name]"
                                    :widget-props="{ ...formModel.widgetProps[field.name], hidden: true }"
                                >
                                    <component
                                        :is="formModel.widgetComponents[field.name]"
                                        v-bind="formModel.widgetProps[field.name]"
                                        v-if="formModel.widgetComponents[field.name]"
                                        :hidden="true"
                                    />
                                </slot>
                                <form-help-text />
                                <form-feedback type="error" />
                                <form-feedback type="message" />
                            </div>
                        </component>
                    </slot>
                </template>
            </objects-grid>
            <slot :class="theme('addButton')" label="Add" name="add-button" verb="add" @click="onAdd">
                <Button :class="theme('addButton')" label="Add" raised text @click="onAdd" />
            </slot>
        </div>
    </div>
</template>
