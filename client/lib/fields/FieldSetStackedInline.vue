<script setup>
import FormChores from "@vueda/components/FormChores.vue";
import InlineRow from "@vueda/components/InlineRow.vue";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { getFieldInitialValue } from "@vueda/use/useModelInitialValues.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { getFormChoresSlotNames } from "@vueda/utils/buildForm.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import { computed, inject, ref } from "vue";

const props = defineProps({
    ...FIELD_PROPS,
    many: {
        type: Boolean,
        default: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const theme = useTheme("FieldSetStackedInline", props);
const selected = ref([]);
const formModel = inject(FormModelSymbol, null);
const fieldNames = computed(() => {
    if (props.fields) {
        return props.fields;
    } else {
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
const addRow = () => {
    fieldContext.blur();
    if (fieldContext.state.value) {
        fieldContext.state.value = [...cloneDeep(fieldContext.state.value), emptyFieldObject()];
    } else {
        fieldContext.state.value = [{}];
    }
};
const removeRow = (index) => {
    fieldContext.blur();
    fieldContext.state.value = cloneDeep(fieldContext.state.value).filter((_, i) => i !== index);
};

const addInline = () => {
    fieldContext.blur();
    fieldContext.state.value = emptyFieldObject();
};

const clearField = () => {
    fieldContext.blur();
    fieldContext.state.value = null;
};

const handleSelected = (selected_) => {
    const added = selected_.filter((i) => !selected.value.includes(i));
    const removed = selected.value.filter((i) => !selected_.includes(i));
    added.forEach((i) => {
        fieldContext.ignore(`${fieldContext.state.name}[${i}]`);
    });
    removed.forEach((i) => {
        fieldContext.removeIgnore(`${fieldContext.state.name}[${i}]`);
    });
    selected.value = selected_;
    if (selected_.length) {
        fieldContext.setModified();
    } else {
        fieldContext.clearModified();
    }
    fieldContext.blur();
    selected.value = selected_;
};

const handleDeleteSingle = (selected_) => {
    if (selected_.length) {
        fieldContext.ignore();
    } else {
        fieldContext.removeIgnore();
    }
    if (selected_.length) {
        fieldContext.setModified();
    } else {
        fieldContext.clearModified();
    }
    fieldContext.blur();
    selected.value = selected_;
};
</script>

<template>
    <div :class="theme('root')">
        <div :class="theme('outer')">
            <slot :class="theme('label')" name="label">
                <div :class="theme('label')">
                    {{ fieldContext.state.label }}
                </div>
            </slot>
            <div v-if="props.many">
                <slot label="Create" name="create-button" size="small" verb="createInline" @click="addRow">
                    <Button label="Create" size="small" @click="addRow" />
                </slot>
            </div>
            <div v-if="!props.many && !fieldContext.state.value">
                <slot label="Create" name="create-button" size="small" verb="createSingularInline" @click="addInline">
                    <Button label="Create" size="small" @click="addInline" />
                </slot>
            </div>
        </div>
        <form-chores>
            <template v-for="slot in getFormChoresSlotNames(fieldContext.state.name)" #[slot]="formChoresSlotProps">
                <slot :name="slot" v-bind="formChoresSlotProps" />
            </template>
        </form-chores>
        <hr :class="theme('hr')" />
        <div :class="theme('inner')">
            <div v-if="!props.many && fieldContext.state.value">
                <InlineRow
                    :field-name="fieldContext.state.name"
                    :fields="fieldNames"
                    :pk="fieldContext.state.value.id"
                    :selected="selected"
                    :theme-override="themeOverride"
                    @delete-row="clearField"
                    @update:selected="handleDeleteSingle"
                />
            </div>
            <div v-else v-for="(value, index) in fieldContext.state.value" :key="index" :class="theme('inlineRows')">
                <InlineRow
                    :field-name="fieldContext.state.name"
                    :fields="fieldNames"
                    :index="index"
                    :pk="value.id"
                    :selected="selected"
                    :theme-override="themeOverride"
                    @delete-row="removeRow"
                    @update:selected="handleSelected"
                >
                    <template #inline-row-delete="slotProps">
                        <slot :index="index" name="inline-row-delete" v-bind="slotProps" />
                    </template>
                </InlineRow>
            </div>
        </div>
    </div>
</template>
