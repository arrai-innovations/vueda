<script setup>
import FieldRenderer from "@vueda/components/FieldRenderer.vue";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import WidgetCheckbox from "@vueda/widgets/WidgetCheckbox.vue";
import Button from "primevue/button";
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
    readOnly: {
        type: Boolean,
        default: false,
    },
    fieldSetContextState: {
        type: Object,
        required: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
const formModel = inject(FormModelSymbol, null);
const theme = useTheme("FieldSetStackedInlineRow", props);

const emit = defineEmits(["destroy-row", "update:selected", "update:model-value"]);
const onDelete = () => emit("destroy-row", props.index);

const slots = useSlots();
const slotNames = ["before-fields", "after-fields", "destroy-button", "destroy-checkbox", "item-action-button"];
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
    <div v-if="formModel.expand?.length" :class="theme('root')">
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
                <template
                    v-for="(fieldObj, foIndex) in fieldSetContextState.fieldObjects.filter((field) => !field.action)"
                    :key="`${fieldObj.name}-${foIndex}`"
                >
                    <field-renderer
                        :fieldset-stacked-inline-props="{
                            index: props.index,
                        }"
                        :form-model="formModel"
                        :form-model-name="fieldObj.name"
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
        <slot name="item-action-bar">
            <div
                v-if="fieldSetContextState.actions.length"
                :class="theme('actionBarOuter')"
                data-qa="field-set-tabular-inline-item-action-bar"
            >
                <template v-for="action in fieldSetContextState.actions">
                    <template v-if="action.fieldName === 'destroy'">
                        <slot
                            v-if="!pk"
                            :action="action"
                            :label="action.label"
                            :name="fieldSetSlotNames['destroy-button'].name"
                            :row-index="index"
                            :selected="fieldSetContextState?.selected.includes(index)"
                            :theme="theme"
                            :value="action.value"
                            verb="destroy"
                            @click="onDelete"
                        >
                            <Button label="Delete" text @click="onDelete" />
                        </slot>
                        <slot
                            v-else
                            :skip-feedback="true"
                            :action="action"
                            :contextless="true"
                            label="Destroy?"
                            :model-value="fieldSetContextState.selected.includes(index)"
                            :name="fieldSetSlotNames['destroy-checkbox'].name"
                            :required="false"
                            :row-index="index"
                            :theme="theme"
                            :value="action.value"
                            verb="destroy"
                            @update:model-value="emit('update:selected', $event)"
                        >
                            <widget-checkbox
                                :skip-feedback="true"
                                :contextless="true"
                                :input-id="`selected-inline-row-${index}`"
                                label="Destroy?"
                                :model-value="fieldSetContextState?.selected.includes(index)"
                                name="destroy-checkbox"
                                :required="false"
                                size="small"
                                :value="index"
                                @update:model-value="emit('update:selected', $event)"
                            />
                        </slot>
                    </template>
                    <template v-else>
                        <slot
                            :name="fieldSetSlotNames['item-action-button'].name"
                            v-bind="{
                                action,
                                fieldSetContextState: fieldSetContextState,
                                rowValueName: `${fieldName}[${index}]`,
                            }"
                            @update:model-value="emit('update:model-value', $event)"
                        >
                            <Button :label="action.label" @update:model-value="emit('update:model-value', $event)" />
                        </slot>
                    </template>
                </template>
            </div>
        </slot>
    </div>
</template>

<style scoped></style>
