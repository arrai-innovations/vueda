<script setup>
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import { inject } from "vue";

const props = defineProps({
    index: {
        type: Number,
        default: undefined,
    },
    pk: {
        type: [String, Number],
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
    fields: {
        type: Array,
        default: undefined,
        description: "A list of the field names to display for each object.",
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
    selected: {
        type: Array,
        default: () => [],
    },
    ...THEME_OVERRIDE_PROPS,
});
const formModel = inject(FormModelSymbol, null);
const theme = useTheme("FieldSetStackedInlineRow", props);

const emit = defineEmits(["delete-row", "update:selected"]);
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
        <div v-if="$slots['before-fields']" :class="theme('beforeFields')">
            <slot name="before-fields" />
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
                <template v-for="field in props.fields" :key="field">
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
                                    :field-details="formModel.fieldDetails[getFieldName(field)]"
                                    :name="`widget(${getFieldPath(field)})`"
                                    :theme="theme"
                                    :widget-component="formModel.widgetComponents[getFieldName(field)]"
                                    :widget-props="formModel.widgetProps[getFieldName(field)]"
                                >
                                    <component
                                        :is="formModel.widgetComponents[getFieldName(field)]"
                                        v-if="formModel.widgetComponents[getFieldName(field)]"
                                        v-bind="formModel.widgetProps[getFieldName(field)]"
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
        <div v-if="$slots['after-fields']" :class="theme('afterFields')">
            <slot name="after-fields" />
        </div>
        <div :class="theme('deleteOuter')">
            <div v-if="pk" class="flex items-center">
                <slot :input-id="`selected-inline-${pk}`" name="selected" :selected="selected" :value="index">
                    <Checkbox
                        :input-id="`selected-inline-${pk}`"
                        :model-value="selected"
                        name="selected"
                        :value="index !== undefined ? index : pk"
                        @update:model-value="emit('update:selected', $event)"
                    />
                    <label class="ml-2" for="`selected-inline-${pk}`"> Delete? </label>
                </slot>
            </div>
            <div v-else>
                <slot label="Delete" name="inline-row-delete" size="small" verb="delete" @click="onDelete">
                    <Button label="Delete" size="small" @click="onDelete" />
                </slot>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
