<script setup>
import FormChores from "@vueda/components/FormChores.vue";
import InlineRow from "@vueda/components/InlineRow.vue";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useTheme } from "@vueda/use/useTheme.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import Button from "primevue/button";

const props = defineProps({
    ...FIELD_PROPS,
    many: {
        type: Boolean,
        default: true,
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const theme = useTheme("FieldSetStackedInline");

const addRow = () => {
    fieldContext.blur();
    if (fieldContext.state.value) {
        fieldContext.state.value = [...cloneDeep(fieldContext.state.value), {}];
    } else {
        fieldContext.state.value = [{}];
    }
};
const removeRow = (index) => {
    fieldContext.blur();
    fieldContext.state.value = cloneDeep(fieldContext.state.value).filter((_, i) => i !== index);
};
</script>

<template>
    <div :class="theme('root')">
        <div :class="theme('header')">
            <slot :class="theme('title')" name="inline-title">
                <div :class="theme('title')">
                    {{ fieldContext.state.label }}
                </div>
            </slot>
            <div v-if="props.many">
                <slot label="Add" name="inline-add-row" size="small" verb="add" @click="addRow">
                    <Button label="Add" size="small" @click="addRow" />
                </slot>
            </div>
        </div>
        <form-chores />
        <hr :class="theme('hr')" />
        <div v-if="!props.many">
            <InlineRow :field-name="fieldContext.state.name" />
        </div>
        <div v-else v-for="(_, index) in fieldContext.state.value" :key="index" :class="theme('inlineRows')">
            <InlineRow :field-name="fieldContext.state.name" :index="index" @delete-row="removeRow">
                <template #inline-row-delete="slotProps">
                    <slot :index="index" name="inline-row-delete" v-bind="slotProps" />
                </template>
            </InlineRow>
        </div>
    </div>
</template>
