<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import FieldSetStackedInlineRow from "@vueda/components/FieldSetStackedInlineRow.vue";
import { ControlButton } from "@vueda/controls/button";
import { ShellFieldDescription, ShellFieldMessage } from "@vueda/shell/field";
import { ShellSeparator } from "@vueda/shell/separator";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, useField } from "@vueda/use/useField.js";
import { FIELD_SET_INLINE_PROPS, useFieldSetInline } from "@vueda/use/useFieldSetInline.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { watch } from "vue";

/**
 * A stacked inline fieldset for editing a list of related objects. Renders
 * each object as a separate stacked row beneath a separator header, with Create
 * and optional toggle buttons. Supports show/hide toggling and row deletion.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps(FIELD_SET_INLINE_PROPS);
const emit = defineEmits([...FIELD_EMITS]);
const fieldSetContext = useField(props, emit);
const fieldSetInline = useFieldSetInline({
    props,
    emit,
    slotNames: ["create-button", "toggle-button", "field-set-level-chores", "title"],
    fieldSetContext,
});
const theme = useTheme("FieldSetStackedInline", props);
const logger = useDevLogger({ fieldContext: fieldSetContext });

watch(
    () => fieldSetContext.state.value,
    (value) => {
        if (value === null || value === undefined) {
            return;
        }
        if (!Array.isArray(value)) {
            logger.warn(`Expected value to be an array of objects, got:`, value);
            return;
        }
        const invalidElement = value.find((item) => item === null || Array.isArray(item) || typeof item !== "object");
        if (invalidElement !== undefined) {
            logger.warn(`Array contains non-object elements:`, invalidElement);
        }
    },
    { immediate: true, deep: true },
);
</script>

<template>
    <div :class="combineClasses(theme('root'), $attrs.class)">
        <div :class="theme('inner')">
            <div :class="theme('titleBar')">
                <div v-if="fieldSetInline.state.hidable" data-qa="field-set-stacked-inline-header-toggle">
                    <!-- @slot [toggle-button, fieldset-toggle-button, field(fieldName)toggle-button] Button to show or hide the inline fieldset. -->
                    <slot
                        :class="theme('toggleButton')"
                        :field-props="fieldSetInline.state.computedFieldProps"
                        :label="fieldSetInline.state.internalVisible ? 'Hide' : 'Show'"
                        :name="fieldSetInline.resolvedSlotNames['toggle-button'].name"
                        :verb="fieldSetInline.state.internalVisible ? 'collapseDown' : 'collapseUp'"
                        @click="fieldSetInline.toggleVisibility"
                    >
                        <ControlButton
                            variant="outline"
                            size="sm"
                            :class="theme('toggleButton')"
                            @click="fieldSetInline.toggleVisibility"
                        >
                            {{ fieldSetInline.state.internalVisible ? "Hide" : "Show" }}
                        </ControlButton>
                    </slot>
                </div>
                <div :class="theme('title')" data-qa="field-set-stacked-inline-title">
                    <!-- @slot [title, fieldset-title, field(fieldName)title] Replaces the fieldset title/label. -->
                    <slot :name="fieldSetInline.resolvedSlotNames['title'].name">
                        {{ fieldSetContext.state.label }}
                    </slot>
                </div>
                <div :class="theme('actionBar')" data-qa="fieldset-tabular-inline-action-bar">
                    <!-- @slot [create-button, fieldset-create-button, field(fieldName)create-button] Button to add a new inline row. -->
                    <slot
                        v-if="fieldSetInline.state.showCreateButton"
                        :class="theme('createButton')"
                        :field-props="fieldSetInline.state.computedFieldProps"
                        label="Create"
                        :name="fieldSetInline.resolvedSlotNames['create-button'].name"
                        verb="createInline"
                        @click="fieldSetInline.doCreate"
                    >
                        <ControlButton
                            variant="outline"
                            size="sm"
                            :class="theme('createButton')"
                            @click="fieldSetInline.doCreate"
                        >
                            Create
                        </ControlButton>
                    </slot>
                </div>
            </div>
            <ShellSeparator :class="theme('hr')" />
            <!-- @slot [field-set-level-chores, fieldset-field-set-level-chores, field(fieldName)field-set-level-chores] Replaces the validation block for this fieldset. -->
            <slot :name="fieldSetInline.resolvedSlotNames['field-set-level-chores'].name">
                <ShellFieldDescription v-if="fieldSetContext.state.help">
                    {{ fieldSetContext.state.help }}
                </ShellFieldDescription>
                <ShellFieldMessage :messages="Object.values(fieldSetContext.state.errors)" />
                <ShellFieldMessage
                    v-if="Object.keys(fieldSetContext.state.messages).length"
                    severity="warning"
                    :messages="Object.values(fieldSetContext.state.messages)"
                />
            </slot>
            <div :class="theme('inlineRows')" data-qa="field-set-stacked-inline-inline-rows">
                <div
                    v-for="(value, index) in fieldSetContext.state.value"
                    :key="index"
                    :class="theme('inlineRow')"
                    data-qa="field-set-stacked-inline-inline-rows"
                >
                    <field-set-stacked-inline-row
                        :field-name="fieldSetContext.state.name"
                        :field-set-context-state="fieldSetInline.state"
                        :index="index"
                        :pk="value?.id"
                        :read-only="props.readOnly"
                        @destroy-row="fieldSetInline.removeObject(index)"
                        @update:selected="fieldSetInline.handleSelected($event, index)"
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
