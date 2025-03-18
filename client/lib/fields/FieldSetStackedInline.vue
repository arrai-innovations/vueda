<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import FieldSetStackedInlineRow from "@vueda/components/FieldSetStackedInlineRow.vue";
import FormChores from "@vueda/components/FormChores.vue";
import { FIELD_EMITS, useField } from "@vueda/use/useField.js";
import { FIELD_SET_INLINE_PROPS, useFieldSetInline } from "@vueda/use/useFieldSetInline.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { getFormChoresSlotNames } from "@vueda/utils/buildForm.js";
import Button from "primevue/button";
import Divider from "primevue/divider";

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
                <div v-if="fieldSetInline.state.hidable" data-qa="fieldset-stacked-inline-header-toggle">
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
                <div :class="theme('title')" data-qa="fieldset-stacked-inline-title">
                    <slot name="title">
                        {{ fieldSetContext.state.label }}
                    </slot>
                </div>
                <div :class="theme('actionBar')" data-qa="fieldset-tabular-inline-action-bar">
                    <slot
                        v-if="fieldSetInline.state.showCreateButton"
                        :class="theme('createButton')"
                        :field-props="fieldSetInline.state.computedFieldProps"
                        label="Create"
                        :name="fieldSetInline.resolvedSlotNames['create-button'].name"
                        verb="createInline"
                        @click="fieldSetInline.doCreate"
                    >
                        <Button :class="theme('createButton')" label="Create" @click="fieldSetInline.doCreate" />
                    </slot>
                </div>
            </Divider>
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
                        :pk="value.id"
                        :read-only="props.readOnly"
                        @destroy-row="fieldSetInline.removeObject(index)"
                        @update:selected="fieldSetInline.handleSelected($event.value, index)"
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
