<script setup>
import FieldRenderer from "@vueda/components/FieldRenderer.vue";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import { computed, inject, unref, useSlots } from "vue";

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
    selected: {
        type: Array,
        default: () => [],
    },
    readOnly: {
        type: Boolean,
        default: false,
    },
    ...THEME_OVERRIDE_PROPS,
});
const formModel = inject(FormModelSymbol, null);
const theme = useTheme("FieldSetStackedInlineRow", props);

const emit = defineEmits(["destroy-row", "update:selected"]);
const onDelete = () => emit("destroy-row", props.index);

const getFieldName = (fieldName) => {
    return `${props.fieldName}__${fieldName}`;
};

const slots = useSlots();
const slotNames = ["before-fields", "after-fields", "destroy-button", "destroy-checkbox"];
const fieldSetSlotNames = slotNames.reduce((acc, name) => {
    acc[name] = useSlotNameResolver(
        computed(() => [`fieldset-${name}`, name]),
        slots,
    );
    return acc;
}, {});
const remainingSlotNames = computed(() => {
    const slotNames = Object.keys(slots);
    const knownSlotNames = ["default", ...slotNames.flatMap((name) => unref(fieldSetSlotNames?.[name]?.possibleNames))];
    return slotNames.filter((slotName) => !knownSlotNames.includes(slotName));
});
</script>
<template>
    <div v-if="formModel.expands?.length" :class="theme('root')">
        <div v-if="fieldSetSlotNames['before-fields'].name" :class="theme('beforeFields')">
            <slot name="before-fields" />
        </div>
        <div v-bind="$attrs" :class="theme('fields')">
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
                    <field-renderer
                        :fieldset-stacked-inline-props="{
                            index: props.index,
                        }"
                        :form-model="formModel"
                        :form-model-name="getFieldName(field)"
                        :hidden="false"
                    >
                        <template v-for="slotName in remainingSlotNames" #[slotName]="slotProps">
                            <slot :name="slotName" v-bind="slotProps" />
                        </template>
                    </field-renderer>
                </template>
            </slot>
        </div>
        <div v-if="fieldSetSlotNames['after-fields'].name" :class="theme('afterFields')">
            <slot name="after-fields" />
        </div>
        <div v-if="!props.readOnly" :class="theme('destroyOuter')">
            <div v-if="pk" class="flex items-center">
                <slot
                    :input-id="`selected-inline-${pk}`"
                    :name="fieldSetSlotNames['destroy-checkbox'].name"
                    :selected="selected"
                    :value="index"
                >
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
                <slot
                    label="Delete"
                    :name="fieldSetSlotNames['destroy-button'].name"
                    size="small"
                    verb="destroy"
                    @click="onDelete"
                >
                    <Button label="Delete" size="small" @click="onDelete" />
                </slot>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
