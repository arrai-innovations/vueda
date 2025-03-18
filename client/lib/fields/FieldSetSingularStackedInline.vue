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
import { onMounted } from "vue";

const props = defineProps({
    ...FIELD_SET_INLINE_PROPS,
    autoCreateWhenEmpty: {
        type: Boolean,
        default: true,
    },
});
const emit = defineEmits([...FIELD_EMITS]);
const fieldSetContext = useField(props, emit);
const theme = useTheme("FieldSetStackedInline", props);
defineOptions({
    inheritAttrs: false,
});
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

onMounted(() => {
    if ((props.autoCreateWhenEmpty || props.required) && !fieldSetContext.state.value) {
        addInline();
    }
});

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
                <div v-if="fieldSetInline.state.hidable" data-qa="fieldset-singular-stacked-inline-header-toggle">
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
                <div :class="theme('title')" data-qa="fieldset-singular-stacked-inline-title">
                    <slot name="title">
                        {{ fieldSetContext.state.label }}
                    </slot>
                </div>
                <div :class="theme('actionBar')" data-qa="fieldset-singular-stacked-inline-action-bar">
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
                data-qa="field-set-stacked-inline-inline-rows"
            >
                <div
                    v-if="fieldSetContext.state.value"
                    :class="theme('inlineRows')"
                    data-qa="field-set-stacked-inline-inline-row"
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
