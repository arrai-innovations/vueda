<script setup>
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import Button from "primevue/button";
import { inject } from "vue";

const props = defineProps({
    index: {
        type: Number,
        required: true,
    },
    fieldName: {
        type: String,
        required: true,
    },
    variant: {
        type: String,
        default: "default",
    },
    fieldComponents: {
        type: Object,
        default: () => ({}),
    },
    fieldProps: {
        type: Object,
        default: () => ({}),
    },
    widgetComponents: {
        type: Object,
        default: () => ({}),
    },
    widgetProps: {
        type: Object,
        default: () => ({}),
    },
});
const formModel = inject(FormModelSymbol, null);
const row_field_name = (fieldName) => {
    const parts = fieldName.split("__");
    if (parts.length > 1) {
        return `${parts[0]}[${props.index}].${parts.slice(1).join(".")}`;
    }
    return fieldName;
};
const emit = defineEmits(["delete-row"]);
const onDelete = () => emit("delete-row", props.index);
</script>
<template>
    <div
        v-for="fieldObj in formModel.expands
            ?.filter((x) => x.split('__')[0] === fieldName)
            .map((x) => formModel.expandDetails?.[x])"
        :key="fieldObj?.name"
    >
        <slot
            :field-component="formModel.fieldComponents[fieldObj?.name].value"
            :field-obj="fieldObj"
            :field-props="formModel.fieldProps[fieldObj.name]"
            :index="index"
            :name="`field(${fieldObj.name})`"
            :widget-component="formModel.widgetComponents[fieldObj.name].value"
            :widget-props="formModel.widgetProps[fieldObj.name]"
        >
            <component
                :is="formModel.fieldComponents[fieldObj?.name].value"
                v-if="formModel.fieldComponents[fieldObj?.name]?.value"
                v-bind="formModel.fieldProps[fieldObj?.name]"
                :name="row_field_name(fieldObj.name)"
            >
                <template v-if="!$slots[`field-${fieldObj?.name}`]" #default>
                    <div>
                        <slot
                            :field-obj="fieldObj"
                            :index="index"
                            :name="`widget(${fieldObj.name})`"
                            :widget-component="formModel.widgetComponents[fieldObj.name].value"
                        >
                            <component
                                :is="formModel.widgetComponents[fieldObj.name].value"
                                v-if="formModel.widgetComponents[fieldObj.name].value"
                                :name="row_field_name(fieldObj.name)"
                                v-bind="formModel.widgetProps[fieldObj.name]"
                            />
                        </slot>
                        <form-help-text />
                        <form-feedback type="error" />
                        <form-feedback type="message" />
                    </div>
                </template>
                <template v-else #default>
                    <slot :name="`field-${fieldObj?.name}`" />
                </template>
            </component>
        </slot>
    </div>
    <slot name="inline-row-delete" :on-delete="onDelete">
        <Button label="delete" @click="onDelete" />
    </slot>
</template>

<style scoped></style>
