<script setup>
import FieldRenderer from "@vueda/components/FieldRenderer.vue";
import Button from "@vueda/controls/button/Button.vue";
import { useSlotNameResolver } from "@vueda/use/useSlotNameResolver.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { FormModelSymbol } from "@vueda/utils/symbols.js";
import WidgetCheckbox from "@vueda/widgets/WidgetCheckbox.vue";
import { computed, inject, unref, useSlots } from "vue";

/**
 * Renders a single row within a stacked inline field set, including all
 * non-action fields and a row-level action bar. The action bar shows a delete
 * button for new (unsaved) rows and a destroy checkbox for existing rows, with
 * slot overrides available for each.
 */
defineOptions({});

const props = defineProps({
    /** Zero-based position of this row within the inline field set. */
    index: {
        type: Number,
        default: undefined,
    },
    /** Primary key of the existing record this row represents; absent for new (unsaved) rows. */
    pk: {
        type: [String, Number],
        default: undefined,
    },
    /** Name of the parent field set field that owns this inline row. */
    fieldName: {
        type: String,
        required: true,
    },
    /** Theme variant to apply to this row's layout. */
    variant: {
        type: String,
        default: "default",
    },
    /** When true, all fields in the row are rendered in read-only mode. */
    readOnly: {
        type: Boolean,
        default: false,
    },
    /** Shared context object provided by the parent field set, containing field objects, actions, and selection state. */
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

const rowState = computed(() => {
    if (props.fieldSetContextState?.selected?.includes?.(props.index)) {
        return "selected-for-destroy";
    }
    if (props.pk === undefined || props.pk === null) {
        return "dirty";
    }
    return null;
});
</script>
<template>
    <div v-if="formModel.expand?.length" :class="[theme('root'), 'group/row']" :data-state="rowState ?? undefined">
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
                        <!-- @slot [destroy-button, fieldset-destroy-button] Button used to delete a new (unsaved) inline row. -->
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
                            <Button variant="ghost" @click="onDelete">Delete</Button>
                        </slot>
                        <!-- @slot [destroy-checkbox, fieldset-destroy-checkbox] Checkbox used to mark an existing inline row for deletion. -->
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
                        <!-- @slot [item-action-button, fieldset-item-action-button] Button for a non-destroy row action. -->
                        <slot
                            :name="fieldSetSlotNames['item-action-button'].name"
                            v-bind="{
                                action,
                                fieldSetContextState: fieldSetContextState,
                                rowValueName: `${fieldName}[${index}]`,
                            }"
                            @update:model-value="emit('update:model-value', $event)"
                        >
                            <Button @update:model-value="emit('update:model-value', $event)">{{ action.label }}</Button>
                        </slot>
                    </template>
                </template>
            </div>
        </slot>
    </div>
</template>

<style scoped></style>
