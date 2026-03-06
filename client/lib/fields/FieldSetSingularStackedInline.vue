<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import FieldSetStackedInlineRow from "@vueda/components/FieldSetStackedInlineRow.vue";
import FormChores from "@vueda/components/FormChores.vue";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, useField } from "@vueda/use/useField.js";
import { FIELD_SET_INLINE_PROPS, useFieldSetInline } from "@vueda/use/useFieldSetInline.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { getFormChoresSlotNames } from "@vueda/utils/buildForm.js";
import Button from "primevue/button";
import Divider from "primevue/divider";
import { toRef, watch } from "vue";

/**
 * A stacked inline fieldset for editing a single related object (one-to-one
 * style). Renders a divider with a title, an optional Create button when no
 * value is present, and a single stacked-inline row when a value exists.
 * Supports show/hide toggling and auto-creates the initial object when the
 * field is required or `autoCreateWhenEmpty` is set.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...FIELD_SET_INLINE_PROPS,
    /** When true, automatically creates an empty inline object if none exists and field objects are available. */
    autoCreateWhenEmpty: {
        type: Boolean,
        default: true,
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldSetContext = useField(props, emit);
const logger = useDevLogger({ fieldContext: fieldSetContext });
const theme = useTheme("FieldSetStackedInline", props);
const fieldSetInline = useFieldSetInline({
    props,
    emit,
    slotNames: ["create-button", "toggle-button", "field-set-level-chores", "title"],
    fieldSetContext,
});

const addInline = () => {
    fieldSetContext.blur();
    fieldSetContext.state.value = fieldSetInline.getEmptyFieldObject();
};

watch(
    [toRef(props, "autoCreateWhenEmpty"), toRef(props, "required"), toRef(fieldSetInline.state, "fieldObjects")],
    ([autoCreateWhenEmpty, required, fieldObjects]) => {
        if ((autoCreateWhenEmpty || required) && !fieldSetInline.state?.value && fieldObjects?.length) {
            fieldSetContext.updateInitialValue(fieldSetInline.getEmptyFieldObject());
            addInline();
        }
    },
);

const clearField = () => {
    fieldSetContext.blur();
    fieldSetContext.state.value = null;
};

const handleDeleteSingle = (selected_) => {
    if (selected_.length) {
        fieldSetContext.ignore();
    } else {
        fieldSetContext.removeIgnore();
    }
    fieldSetContext.blur();
    fieldSetInline.state.selected.value = selected_;
};
/* todo: this field seems very copy and pasted from FieldSetStackedInline, could
         `singular` just a prop on that component?
*/
watch(
    () => fieldSetContext.state.value,
    (value) => {
        if (value === null || value === undefined) {
            return; // OK: allow null/undefined
        }
        if (typeof value !== "object" || Array.isArray(value)) {
            logger.warn(`Expected value to be a plain object (single inline object), got:`, value);
        }
    },
    { immediate: true },
);
</script>

<template>
    <div :class="combineClasses(theme('root'), $attrs.class)">
        <div :class="theme('inner')">
            <Divider
                :pt="{
                    root: {
                        class: theme('dividerRoot'),
                    },
                    content: {
                        class: theme('dividerContent'),
                    },
                }"
            >
                <div v-if="fieldSetInline.state.hidable" data-qa="field-set-singular-stacked-inline-header-toggle">
                    <!-- @slot [toggle-button, fieldset-toggle-button, field(fieldName)toggle-button] Button to show or hide the inline fieldset. -->
                    <slot
                        :class="theme('toggleButton')"
                        :field-props="fieldSetInline.state.computedFieldProps"
                        :label="fieldSetInline.state.internalVisible ? 'Hide' : 'Show'"
                        :name="fieldSetInline.resolvedSlotNames['toggle-button'].name"
                        :verb="fieldSetInline.state.internalVisible ? 'collapseDown' : 'collapseUp'"
                        @click="fieldSetInline.toggleVisibility"
                    >
                        <Button
                            :class="theme('toggleButton')"
                            :label="fieldSetInline.state.internalVisible ? 'Hide' : 'Show'"
                            @click="fieldSetInline.toggleVisibility"
                        />
                    </slot>
                </div>
                <div :class="theme('title')" data-qa="field-set-singular-stacked-inline-title">
                    <!-- @slot [title, fieldset-title, field(fieldName)title] Replaces the fieldset title/label. -->
                    <slot :name="fieldSetInline.resolvedSlotNames['title'].name">
                        {{ fieldSetContext.state.label }}
                    </slot>
                </div>
                <div :class="theme('actionBar')" data-qa="field-set-singular-stacked-inline-action-bar">
                    <!-- @slot [create-button, fieldset-create-button, field(fieldName)create-button] Button to add a new inline row. -->
                    <slot
                        v-if="fieldSetInline.state.showCreateButton && !fieldSetContext.state.value"
                        :class="theme('createButton')"
                        :field-props="fieldSetInline.state.computedFieldProps"
                        label="Create"
                        :name="fieldSetInline.resolvedSlotNames['create-button'].name"
                        verb="createInline"
                        @click="addInline"
                    >
                        <Button :class="theme('createButton')" label="Create" @click="addInline" />
                    </slot>
                </div>
            </Divider>
            <!-- @slot [field-set-level-chores, fieldset-field-set-level-chores, field(fieldName)field-set-level-chores] Replaces the form-level validation chores block for this fieldset. -->
            <slot :name="fieldSetInline.resolvedSlotNames['field-set-level-chores'].name">
                <form-chores :variant="null">
                    <template
                        v-for="slot in getFormChoresSlotNames(fieldSetContext.state.name)"
                        #[slot]="formChoresSlotProps"
                    >
                        <slot :name="slot" v-bind="formChoresSlotProps" />
                    </template>
                </form-chores>
            </slot>
            <div
                :class="{ hidden: !fieldSetInline.state.internalVisible }"
                data-qa="field-set-singular-stacked-inline-inline-rows"
            >
                <div
                    v-if="fieldSetContext.state.value"
                    :class="theme('inlineRows')"
                    data-qa="field-set-singular-stacked-inline-inline-row"
                >
                    <field-set-stacked-inline-row
                        :field-name="fieldSetContext.state.name"
                        :field-set-context-state="fieldSetInline.state"
                        :pk="fieldSetContext.state.value.id"
                        :read-only="props.readOnly"
                        @destroy-row="clearField"
                        @update:selected="handleDeleteSingle"
                    >
                        <template v-for="slotName in fieldSetInline.state.remainingSlotNames" #[slotName]="slotProps">
                            <slot :name="slotName" v-bind="slotProps" />
                        </template>
                    </field-set-stacked-inline-row>
                </div>
            </div>
        </div>
    </div>
</template>
