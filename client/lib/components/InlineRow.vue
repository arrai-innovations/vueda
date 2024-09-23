<script setup>
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import { useTheme } from "@vueda/use/useTheme.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import Button from "primevue/button";
import { inject } from "vue";
import { deepUnref } from "vue-deepunref";

const props = defineProps({
    index: {
        type: Number,
        default: undefined,
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
});
const formModel = inject(FormModelSymbol, null);
const theme = useTheme("FieldSetStackedInlineRow");

const emit = defineEmits(["delete-row"]);
const onDelete = () => emit("delete-row", props.index);

const getFieldName = (fieldName) => {
    return `${props.fieldName}__${fieldName}`;
};
const getFieldPath = (fieldName) => {
    if (props.index === undefined) {
        return `${props.fieldName}.${fieldName}`;
    }
    return `${props.fieldName}[${props.index}].${fieldName}`;
};
</script>
<template>
    <div v-if="formModel.expands?.length" :class="theme('root')">
        <div v-if="$slots.beforeFields" :class="theme('beforeFields')">
            <slot name="beforeFields" />
        </div>
        <div v-bind="$attrs">
            <slot
                :all-widget-props="formModel.widgetProps"
                :field-components="formModel.fieldComponents"
                :field-details="formModel.fieldDetails"
                :field-props="formModel.fieldProps"
                name="fields"
                :theme="theme"
                :widget-components="formModel.widgetComponents"
            >
                <template
                    v-for="field in Object.keys(deepUnref(formModel.expandDetails)?.[props.fieldName]?.f)"
                    :key="field"
                >
                    <slot
                        :field-class="theme('field')"
                        :field-component="formModel.fieldComponents[getFieldName(field)]"
                        :field-detail="formModel.fieldDetails[getFieldName(field)]"
                        :field-inner-class="theme('fieldInner')"
                        :field-props="formModel.fieldProps[getFieldName(field)]"
                        :name="`field(${getFieldPath(field)})`"
                        :theme="theme"
                        :widget-component="formModel.widgetComponents[getFieldName(field)]"
                        :widget-props="formModel.widgetProps[getFieldName(field)]"
                    >
                        <component
                            :is="formModel.fieldComponents[getFieldName(field)]"
                            v-if="formModel.fieldComponents[getFieldName(field)]"
                            :class="theme('field')"
                            v-bind="formModel.fieldProps[getFieldName(field)]"
                            :name="getFieldPath(field)"
                        >
                            <div :class="theme('fieldInner')">
                                <slot
                                    :field-object="formModel.fieldDetails[getFieldName(field)]"
                                    :name="`widget(${getFieldPath(field)})`"
                                    :theme="theme"
                                    :widget-component="formModel.widgetComponents[getFieldName(field)]"
                                    :widget-props="formModel.widgetProps[getFieldName(field)]"
                                >
                                    <component
                                        :is="formModel.widgetComponents[getFieldName(field)]"
                                        v-bind="formModel.widgetProps[getFieldName(field)]"
                                        v-if="formModel.widgetComponents[getFieldName(field)]"
                                    />
                                </slot>
                                <form-help-text />
                                <form-feedback type="error" />
                                <form-feedback type="message" />
                            </div>
                        </component>
                    </slot>
                </template>
            </slot>
        </div>
        <div v-if="$slots.afterFields" :class="theme('afterFields')">
            <slot name="afterFields" />
        </div>
        <div v-if="props.index" class="card-header">
            <slot label="Delete" name="inline-row-delete" size="small" verb="delete" @click="onDelete">
                <Button label="Delete" size="small" @click="onDelete" />
            </slot>
        </div>
    </div>
</template>

<style scoped></style>
