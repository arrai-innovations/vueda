<script setup>
import FormFeedback from "@vueda/components/FormFeedback.vue";
import FormHelpText from "@vueda/components/FormHelpText.vue";
import vuedaTailwind from "@vueda/theme/vueda-tailwind/index.js";
import { useComputedClasses } from "@vueda/use/useComputedClasses.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import Button from "primevue/button";
import { inject } from "vue";
import { deepUnref } from "vue-deepunref";

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
const theme = useComputedClasses(vuedaTailwind.FormModel);

const emit = defineEmits(["delete-row"]);
const onDelete = () => emit("delete-row", props.index);
</script>
<template>
    <template v-if="formModel.expands?.length">
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
                    v-for="fieldName in Object.keys(deepUnref(formModel.expandDetails)?.[props.fieldName]?.f)"
                    :key="fieldName"
                >
                    <slot
                        :field-class="theme('field')"
                        :field-component="formModel.fieldComponents[`${props.fieldName}__${fieldName}`]"
                        :field-detail="formModel.fieldDetails[`${props.fieldName}__${fieldName}`]"
                        :field-inner-class="theme('fieldInner')"
                        :field-props="formModel.fieldProps[`${props.fieldName}__${fieldName}`]"
                        :name="`field(${props.fieldName}__${fieldName})`"
                        :theme="theme"
                        :widget-component="formModel.widgetComponents[`${props.fieldName}__${fieldName}`]"
                        :widget-props="formModel.widgetProps[`${props.fieldName}__${fieldName}`]"
                    >
                        <component
                            :is="formModel.fieldComponents[`${props.fieldName}__${fieldName}`]"
                            v-if="formModel.fieldComponents[`${props.fieldName}__${fieldName}`]"
                            :class="theme('field')"
                            v-bind="formModel.fieldProps[`${props.fieldName}__${fieldName}`]"
                        >
                            <div :class="theme('fieldInner')">
                                <slot
                                    :field-object="formModel.fieldDetails[`${props.fieldName}__${fieldName}`]"
                                    :name="`widget(${props.fieldName}__${fieldName})`"
                                    :theme="theme"
                                    :widget-component="formModel.widgetComponents[`${props.fieldName}__${fieldName}`]"
                                    :widget-props="formModel.widgetProps[`${props.fieldName}__${fieldName}`]"
                                >
                                    <component
                                        :is="formModel.widgetComponents[`${props.fieldName}__${fieldName}`]"
                                        v-bind="formModel.widgetProps[`${props.fieldName}__${fieldName}`]"
                                        v-if="formModel.widgetComponents[`${props.fieldName}__${fieldName}`]"
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
    </template>
    <slot name="inline-row-delete" :on-delete="onDelete">
        <Button label="delete" @click="onDelete" />
    </slot>
</template>

<style scoped></style>
