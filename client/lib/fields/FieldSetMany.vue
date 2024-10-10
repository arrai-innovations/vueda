<script setup>
import FormChores from "@vueda/components/FormChores.vue";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { getFormChoresSlotNames } from "@vueda/utils/buildForm.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import isArray from "lodash-es/isArray.js";
import Button from "primevue/button";
import { computed, toRef, useAttrs, watch } from "vue";

const attrs = useAttrs();
const props = defineProps({
    ...FIELD_PROPS,
    manyComponent: {
        type: Object,
        required: true,
    },
});
const preprocessGet = (value) => {
    if (value === undefined || value === null) {
        return value;
    }
    return isArray(value) ? value : [value];
};

const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit, { preprocessGet });

const fieldProps = computed(() => {
    const values = fieldContext.state.value;
    const indexes = isArray(values) && values.length ? values.map((_, index) => index) : [0];
    return indexes.map((index) => ({
        ...props,
        ...attrs,
        name: `${fieldContext.state.name}[${index}]`,
    }));
});

const onAdd = () => {
    fieldContext.state.value = [...(cloneDeep(fieldContext.state.value) || [""]), undefined];
};

const onDelete = (index) => {
    fieldContext.state.value = cloneDeep(fieldContext.state.value).filter((_, i) => i !== index);
};
const theme = useTheme("FieldSetMany");

const isEmptyValue = (value) => {
    return value === "";
};
watch(
    toRef(fieldContext.state, "value"),
    (newValue) => {
        if (Array.isArray(newValue) && newValue.length === 1 && isEmptyValue(newValue[0])) {
            fieldContext.state.value = [];
        }
    },
    { immediate: true, deep: true },
);
</script>
<template>
    <div data-qa="field-set-many">
        <div :class="theme('header')">
            <slot :field-label="fieldContext.state.label" :field-name="fieldContext.state.name" name="label">
                <label :class="theme('label')" :for="fieldContext.state.name">
                    {{ fieldContext.state.label }}
                </label>
            </slot>
            <slot name="add" @click="onAdd">
                <Button label="add" @click="onAdd"></Button>
            </slot>
        </div>
        <div v-if="fieldProps?.length">
            <template v-for="(fieldProp, index) in fieldProps" :key="index">
                <slot :name="`field(${fieldProp.name})`" v-bind="{ fieldProps, index }">
                    <div :class="theme('row')">
                        <div :class="theme('component')">
                            <component :is="props.manyComponent" v-bind="fieldProp" :required="index > 0">
                                <slot :hidden="true" />
                            </component>
                        </div>
                        <div v-if="index">
                            <slot name="delete" @click="onDelete(index)">
                                <Button icon="pi pi-times" rounded @click="onDelete(index)" />
                            </slot>
                        </div>
                    </div>
                </slot>
            </template>
        </div>
        <form-chores>
            <template v-for="slot in getFormChoresSlotNames(fieldContext.state.name)" #[slot]="formChoresSlotProps">
                <slot :name="slot" v-bind="formChoresSlotProps" />
            </template>
        </form-chores>
    </div>
</template>
