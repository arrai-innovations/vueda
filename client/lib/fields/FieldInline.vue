<script setup>
import InlineRow from "@vueda/components/InlineRow.vue";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import cloneDeep from "lodash-es/cloneDeep.js";
import Button from "primevue/button";
import Divider from "primevue/divider";

const props = defineProps({
    ...FIELD_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldContext = useField(props, emit);
const theme = useComputedClasses(vuedaTailwind.FormModel);

const addRow = () => {
    fieldContext.state.value = [...cloneDeep(fieldContext.state.value), {}];
};
const removeRow = (index) => {
    fieldContext.state.value = cloneDeep(fieldContext.state.value).filter((_, i) => i !== index);
};
</script>

<template>
    <div :class="theme('root')">
        <div>
            <slot name="inline-title">
                {{ fieldContext.state.name }}
            </slot>
            <slot name="inline-add-row" :onclick="addRow">
                <Button label="add" @click="addRow"></Button>
            </slot>
        </div>
        <Divider />
        <slot></slot>
        <div v-for="(_, index) in fieldContext.state.value" :key="index">
            <InlineRow :field-name="fieldContext.state.name" :index="index" @delete-row="removeRow">
                <template #inline-row-delete="{ onDelete }">
                    <slot :index="index" name="inline-row-delete" :on-delete="onDelete" />
                </template>
            </InlineRow>
        </div>
    </div>
</template>
