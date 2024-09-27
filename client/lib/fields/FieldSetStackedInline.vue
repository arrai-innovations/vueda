<script setup>
import FormChores from "@vueda/components/FormChores.vue";
import InlineRow from "@vueda/components/InlineRow.vue";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useTheme } from "@vueda/use/useTheme.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import Button from "primevue/button";
import { ref } from "vue";

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
const selected = ref([]);
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
    selected.value = selected_;
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
                <slot label="Create" name="create-button" size="small" verb="createInline" @click="addRow">
                    <Button label="Create" size="small" @click="addRow" />
                </slot>
            </div>
        </div>
        <form-chores>
            <template v-for="(_, slot) in $slots" #[slot]="slotProps">
                <slot :name="slot" v-bind="slotProps" />
            </template>
        </form-chores>
        <hr :class="theme('hr')" />
        <div :class="theme('inner')">
            <div v-if="!props.many">
                <InlineRow :field-name="fieldContext.state.name" />
            </div>
            <div v-else v-for="(value, index) in fieldContext.state.value" :key="index" :class="theme('inlineRows')">
                <InlineRow
                    :field-name="fieldContext.state.name"
                    :index="index"
                    :pk="value.id"
                    :selected="selected"
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
