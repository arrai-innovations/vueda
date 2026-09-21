<script setup>
import Button from "@vueda/controls/button/Button.vue";
import FieldSetStackedInlineRow from "@vueda/form/field-set/FieldSetStackedInlineRow.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldMessage from "@vueda/shell/field/FieldMessage.vue";
import "@vueda/theme/vueda-tailwind/form/FieldSetStackedInline.theme.js";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, useField } from "@vueda/use/useField.js";
import { FIELD_SET_INLINE_PROPS, useFieldSetInline } from "@vueda/use/useFieldSetInline.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { computed, toRef, watch } from "vue";

/**
 * A stacked inline fieldset for editing a single related object (one-to-one
 * style). Renders a separator with a title, an optional Create button when no
 * value is present, and a single stacked-inline row when a value exists.
 * Supports show/hide toggling and auto-creates the initial object when the
 * field is required or `autoCreateWhenEmpty` is set.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...THEME_OVERRIDE_PROPS,
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
const icon = useIcons("FieldSetSingularStackedInline", props);
const fieldSetInline = useFieldSetInline({
    props,
    emit,
    slotNames: ["create-button", "toggle-button", "field-set-level-chores", "title", "empty-state"],
    fieldSetContext,
});

const hasChoresContent = computed(
    () =>
        !!fieldSetContext.state.help ||
        Object.keys(fieldSetContext.state.errors).length > 0 ||
        Object.keys(fieldSetContext.state.messages).length > 0,
);

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
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-vueda-fieldset v-bind="$attrs">
        <div :class="theme('inner')">
            <div
                :class="[theme('titleBar'), fieldSetInline.state.hidable ? theme('titleBarToggle') : '']"
                :role="fieldSetInline.state.hidable ? 'button' : undefined"
                :tabindex="fieldSetInline.state.hidable ? 0 : undefined"
                :aria-expanded="fieldSetInline.state.hidable ? fieldSetInline.state.internalVisible : undefined"
                data-qa="field-set-singular-stacked-inline-title-bar"
                @click="fieldSetInline.state.hidable ? fieldSetInline.toggleVisibility() : undefined"
                @keydown.space.prevent="fieldSetInline.state.hidable ? fieldSetInline.toggleVisibility() : undefined"
                @keydown.enter.prevent="fieldSetInline.state.hidable ? fieldSetInline.toggleVisibility() : undefined"
            >
                <span
                    v-if="fieldSetInline.state.hidable"
                    :class="[theme('toggleIndicator'), { '-rotate-90': !fieldSetInline.state.internalVisible }]"
                    data-qa="field-set-singular-stacked-inline-header-toggle"
                    aria-hidden="true"
                >
                    <!-- @slot [toggle-button, fieldset-toggle-button, field(fieldName)toggle-button] Replaces the disclosure indicator inside the title bar. The bar itself drives the toggle. -->
                    <slot
                        :class="theme('toggleButton')"
                        :field-props="fieldSetInline.state.computedFieldProps"
                        :label="fieldSetInline.state.internalVisible ? 'Hide' : 'Show'"
                        :name="fieldSetInline.resolvedSlotNames['toggle-button'].name"
                    >
                        <component
                            :is="icon('chevronDown').component"
                            v-if="icon('chevronDown')"
                            v-bind="icon('chevronDown').props"
                        />
                    </slot>
                </span>
                <div :class="theme('title')" data-qa="field-set-singular-stacked-inline-title">
                    <!-- @slot [title, fieldset-title, field(fieldName)title] Replaces the fieldset title/label. -->
                    <slot :name="fieldSetInline.resolvedSlotNames['title'].name">
                        {{ fieldSetContext.state.label }}
                    </slot>
                </div>
                <div
                    :class="theme('actionBar')"
                    data-qa="field-set-singular-stacked-inline-action-bar"
                    @click.stop
                    @keydown.space.stop
                    @keydown.enter.stop
                >
                    <!-- @slot [create-button, fieldset-create-button, field(fieldName)create-button] Button to add a new inline row. -->
                    <slot
                        v-if="fieldSetInline.state.showCreateButton && !fieldSetContext.state.value"
                        :class="theme('createButton')"
                        :field-props="fieldSetInline.state.computedFieldProps"
                        label="Create"
                        :name="fieldSetInline.resolvedSlotNames['create-button'].name"
                        @click="addInline"
                    >
                        <Button
                            type="button"
                            emphasis="outline"
                            size="sm"
                            :class="theme('createButton')"
                            @click="addInline"
                        >
                            Create
                        </Button>
                    </slot>
                </div>
            </div>
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
                <!-- @slot [empty-state, fieldset-empty-state, field(fieldName)empty-state] Replaces the dashed-border empty-state block shown when no value is present. -->
                <slot v-else :class="theme('emptyState')" :name="fieldSetInline.resolvedSlotNames['empty-state'].name">
                    <div :class="theme('emptyState')" data-qa="field-set-singular-stacked-inline-empty-state">
                        <component
                            :is="icon('empty').component"
                            v-if="icon('empty')"
                            :class="theme('emptyStateIcon')"
                            v-bind="icon('empty').props"
                            aria-hidden="true"
                        />
                        <p :class="theme('emptyStateTitle')">No {{ fieldSetContext.state.label }} yet</p>
                        <p v-if="fieldSetInline.state.showCreateButton" :class="theme('emptyStateDesc')">
                            Click Create to add one.
                        </p>
                    </div>
                </slot>
            </div>
            <div
                v-if="hasChoresContent || fieldSetInline.resolvedSlotNames['field-set-level-chores'].exists"
                :class="theme('choresPanel')"
                data-qa="field-set-singular-stacked-inline-chores"
            >
                <!-- @slot [field-set-level-chores, fieldset-field-set-level-chores, field(fieldName)field-set-level-chores] Replaces the validation block for this fieldset. -->
                <slot :name="fieldSetInline.resolvedSlotNames['field-set-level-chores'].name">
                    <FieldDescription v-if="fieldSetContext.state.help">
                        {{ fieldSetContext.state.help }}
                    </FieldDescription>
                    <FieldMessage :messages="Object.values(fieldSetContext.state.errors)" />
                    <FieldMessage
                        v-if="Object.keys(fieldSetContext.state.messages).length"
                        severity="warning"
                        :messages="Object.values(fieldSetContext.state.messages)"
                    />
                </slot>
            </div>
        </div>
    </div>
</template>
