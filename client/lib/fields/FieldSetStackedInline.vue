<script setup>
import FieldSetStackedInlineRow from "@vueda/components/FieldSetStackedInlineRow.vue";
import Button from "@vueda/controls/button/Button.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldMessage from "@vueda/shell/field/FieldMessage.vue";
import "@vueda/theme/vueda-tailwind/form/FieldSetStackedInline.theme.js";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, useField } from "@vueda/use/useField.js";
import { FIELD_SET_INLINE_PROPS, useFieldSetInline } from "@vueda/use/useFieldSetInline.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { useTheme } from "@vueda/use/useTheme.js";
import { computed, watch } from "vue";

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
    slotNames: ["create-button", "toggle-button", "field-set-level-chores", "title", "empty-state"],
    fieldSetContext,
});
const theme = useTheme("FieldSetStackedInline", props);
const icon = useIcons("FieldSetStackedInline");
const logger = useDevLogger({ fieldContext: fieldSetContext });

const hasChoresContent = computed(
    () =>
        !!fieldSetContext.state.help ||
        Object.keys(fieldSetContext.state.errors).length > 0 ||
        Object.keys(fieldSetContext.state.messages).length > 0,
);

const isEmpty = computed(() => !Array.isArray(fieldSetContext.state.value) || fieldSetContext.state.value.length === 0);

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
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-vueda-fieldset v-bind="$attrs">
        <div :class="theme('inner')">
            <div
                :class="[theme('titleBar'), fieldSetInline.state.hidable ? theme('titleBarToggle') : '']"
                :role="fieldSetInline.state.hidable ? 'button' : undefined"
                :tabindex="fieldSetInline.state.hidable ? 0 : undefined"
                :aria-expanded="fieldSetInline.state.hidable ? fieldSetInline.state.internalVisible : undefined"
                data-qa="field-set-stacked-inline-title-bar"
                @click="fieldSetInline.state.hidable ? fieldSetInline.toggleVisibility() : undefined"
                @keydown.space.prevent="fieldSetInline.state.hidable ? fieldSetInline.toggleVisibility() : undefined"
                @keydown.enter.prevent="fieldSetInline.state.hidable ? fieldSetInline.toggleVisibility() : undefined"
            >
                <span
                    v-if="fieldSetInline.state.hidable"
                    :class="[theme('toggleIndicator'), { '-rotate-90': !fieldSetInline.state.internalVisible }]"
                    data-qa="field-set-stacked-inline-header-toggle"
                    aria-hidden="true"
                >
                    <!-- @slot [toggle-button, fieldset-toggle-button, field(fieldName)toggle-button] Replaces the disclosure indicator inside the title bar. The bar itself drives the toggle. -->
                    <slot
                        :class="theme('toggleButton')"
                        :field-props="fieldSetInline.state.computedFieldProps"
                        :label="fieldSetInline.state.internalVisible ? 'Hide' : 'Show'"
                        :name="fieldSetInline.resolvedSlotNames['toggle-button'].name"
                        :verb="fieldSetInline.state.internalVisible ? 'collapseDown' : 'collapseUp'"
                    >
                        <component
                            :is="icon('chevronDown').component"
                            v-if="icon('chevronDown')"
                            v-bind="icon('chevronDown').props"
                        />
                    </slot>
                </span>
                <div :class="theme('title')" data-qa="field-set-stacked-inline-title">
                    <!-- @slot [title, fieldset-title, field(fieldName)title] Replaces the fieldset title/label. -->
                    <slot :name="fieldSetInline.resolvedSlotNames['title'].name">
                        {{ fieldSetContext.state.label }}
                    </slot>
                </div>
                <div
                    :class="theme('actionBar')"
                    data-qa="fieldset-tabular-inline-action-bar"
                    @click.stop
                    @keydown.space.stop
                    @keydown.enter.stop
                >
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
                        <Button
                            variant="outline"
                            size="sm"
                            :class="theme('createButton')"
                            @click="fieldSetInline.doCreate"
                        >
                            Create
                        </Button>
                    </slot>
                </div>
            </div>
            <div v-if="!isEmpty" :class="theme('inlineRows')" data-qa="field-set-stacked-inline-inline-rows">
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
            <!-- @slot [empty-state, fieldset-empty-state, field(fieldName)empty-state] Replaces the dashed-border empty-state block shown when there are no rows. -->
            <slot
                v-if="isEmpty"
                :class="theme('emptyState')"
                :name="fieldSetInline.resolvedSlotNames['empty-state'].name"
            >
                <div :class="theme('emptyState')" data-qa="field-set-stacked-inline-empty-state">
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
            <div
                v-if="hasChoresContent || fieldSetInline.resolvedSlotNames['field-set-level-chores'].exists"
                :class="theme('choresPanel')"
                data-qa="field-set-stacked-inline-chores"
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
