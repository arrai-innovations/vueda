<script setup>
import FormChores from "@vueda/components/FormChores.vue";
import InlineRow from "@vueda/components/InlineRow.vue";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import Button from "primevue/button";

const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const theme = useComputedClasses(vuedaTailwind.FieldSetStackedInline);

const addRow = () => {
    fieldContext.blur();
    fieldContext.state.value = [...cloneDeep(fieldContext.state.value), {}];
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
            <slot label="Add" name="inline-add-row" size="small" verb="add" @click="addRow">
                <Button label="Add" size="small" @click="addRow" />
            </slot>
        </div>
        <hr :class="theme('hr')" />
        <slot></slot>
        <div v-for="(_, index) in fieldContext.state.value" :key="index" :class="theme('inlineRows')">
            <InlineRow :field-name="fieldContext.state.name" :index="index" @delete-row="removeRow">
                <template #inline-row-delete="slotProps">
                    <slot :index="index" name="inline-row-delete" v-bind="slotProps" />
                </template>
            </InlineRow>
        </div>
        <form-chores />
    </div>
</template>
