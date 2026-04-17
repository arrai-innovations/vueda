<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import FieldRenderer from "@vueda/components/FieldRenderer.vue";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import Button from "@vueda/controls/button/Button.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldMessage from "@vueda/shell/field/FieldMessage.vue";
import Separator from "@vueda/shell/separator/Separator.vue";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import {
    FIELD_SET_TABULAR_INLINE_EMITS,
    FIELD_SET_TABULAR_INLINE_PROPS,
    useFieldSetTabularInline,
} from "@vueda/use/useFieldSetTabularInline.js";
import WidgetCheckbox from "@vueda/widgets/WidgetCheckbox.vue";
import omit from "lodash-es/omit.js";
import { watch } from "vue";

const logger = useDevLogger();

/**
 * A tabular inline fieldset for editing a list of related objects in a
 * grid layout. Renders rows through an `ObjectsGrid`, adapts between table
 * and card views based on breakpoint, and provides Create, Delete, and
 * custom item-action buttons alongside optional show/hide toggling.
 */

defineOptions({
    inheritAttrs: false,
});
const props = defineProps(FIELD_SET_TABULAR_INLINE_PROPS);
const emit = defineEmits([...FIELD_SET_TABULAR_INLINE_EMITS]);
const fieldSetTabularInline = useFieldSetTabularInline({
    props,
    emit,
    slotNames: [
        "title",
        "toggle-button",
        "create-button",
        "create-button-inline",
        "destroy-button",
        "destroy-checkbox",
        // todo: implement action-button for non item actions
        // "action-button",
        "item-action-button",
    ],
});

watch(
    () => fieldSetTabularInline.fieldSetContext.state.value,
    (value) => {
        if (value === null || value === undefined) {
            return;
        }
        if (!Array.isArray(value)) {
            logger.warn(`Expected value to be an array of objects, got:`, value);
            return;
        }
        const invalidElement = value.find((item) => typeof item !== "object" || item === null || Array.isArray(item));
        if (invalidElement) {
            logger.warn(`Array contains non-object elements:`, invalidElement);
        }
    },
    { immediate: true, deep: true },
);
</script>

<template>
    <div
        ref="test"
        :class="fieldSetTabularInline.theme('root')"
        data-qa="field-set-tabular-inline-root"
        v-bind="$attrs"
    >
        <div :class="fieldSetTabularInline.theme('inner')" data-qa="field-set-tabular-inline-inner">
            <div :class="fieldSetTabularInline.theme('titleBar')">
                <div v-if="fieldSetTabularInline.state.hidable" data-qa="field-set-tabular-inline-header-toggle">
                    <!-- @slot [toggle-button, fieldset-toggle-button, field(fieldName)toggle-button] Button to show or hide the tabular inline fieldset. -->
                    <slot
                        :class="fieldSetTabularInline.theme('toggleButton')"
                        :field-props="fieldSetTabularInline.state.computedFieldProps"
                        :label="fieldSetTabularInline.state.internalVisible ? 'Hide' : 'Show'"
                        :name="fieldSetTabularInline.resolvedSlotNames['toggle-button'].name"
                        :verb="fieldSetTabularInline.state.internalVisible ? 'collapseDown' : 'collapseUp'"
                        @click="fieldSetTabularInline.toggleVisibility"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            :class="fieldSetTabularInline.theme('toggleButton')"
                            @click="fieldSetTabularInline.toggleVisibility"
                        >
                            {{ fieldSetTabularInline.state.internalVisible ? "Hide" : "Show" }}
                        </Button>
                    </slot>
                </div>
                <div :class="fieldSetTabularInline.theme('title')" data-qa="field-set-tabular-inline-title">
                    <!-- @slot [title, fieldset-title, field(fieldName)title] Replaces the fieldset title/label. -->
                    <slot :name="fieldSetTabularInline.resolvedSlotNames['title'].name">
                        {{ fieldSetTabularInline.fieldSetContext.state.label }}
                    </slot>
                </div>
                <div :class="fieldSetTabularInline.theme('actionBar')" data-qa="field-set-tabular-inline-action-bar">
                    <!-- @slot [create-button, fieldset-create-button, field(fieldName)create-button] Button to add a new tabular inline row, shown in the header. -->
                    <slot
                        v-if="
                            fieldSetTabularInline.state.isTable &&
                            !fieldSetTabularInline.state.computedFieldProps.readOnly &&
                            props.showCreateButton
                        "
                        :class="fieldSetTabularInline.theme('createButton')"
                        :field-props="fieldSetTabularInline.state.computedFieldProps"
                        label="Create"
                        :name="fieldSetTabularInline.resolvedSlotNames['create-button'].name"
                        verb="createInline"
                        @click="fieldSetTabularInline.doCreate"
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            :class="fieldSetTabularInline.theme('createButton')"
                            @click="fieldSetTabularInline.doCreate"
                        >
                            Create
                        </Button>
                    </slot>
                </div>
            </div>
            <Separator :class="fieldSetTabularInline.theme('hr')" />
            <!-- @slot [field-set-level-chores] Replaces the validation block rendered above the rows. -->
            <slot name="field-set-level-chores">
                <FieldDescription v-if="fieldSetTabularInline.fieldSetContext.state.help">
                    {{ fieldSetTabularInline.fieldSetContext.state.help }}
                </FieldDescription>
                <FieldMessage :messages="Object.values(fieldSetTabularInline.fieldSetContext.state.errors)" />
                <FieldMessage
                    v-if="Object.keys(fieldSetTabularInline.fieldSetContext.state.messages).length"
                    severity="warning"
                    :messages="Object.values(fieldSetTabularInline.fieldSetContext.state.messages)"
                />
            </slot>
            <objects-grid
                :class="
                    combineClasses(fieldSetTabularInline.theme('objectsGrid'), {
                        [fieldSetTabularInline.theme('objectsGridHidden')]:
                            !fieldSetTabularInline.state.internalVisible,
                    })
                "
                :empty-text="null"
                :field-classes="{
                    selected_: 'text-center',
                }"
                :fields="fieldSetTabularInline.state.computedFieldObjects"
                :objects-in-order="fieldSetTabularInline.fieldSetContext.state.value"
                :table-breakpoint="$attrs.tableBreakpoint || 'lg'"
                v-bind="omit($attrs, ['class', 'hidden'])"
                @update:is-table="fieldSetTabularInline.handleIsTableUpdate"
            >
                <template
                    v-for="fieldObj in fieldSetTabularInline.state.fieldObjects"
                    :key="fieldObj.name"
                    #[`header(${fieldObj.name})`]="headerSlotProps"
                >
                    <!-- @slot [header(fieldName)] Override the header label cell for a specific column. -->
                    <slot :name="`header(${fieldObj.name})`" v-bind="headerSlotProps">
                        <div :class="headerSlotProps.class" :data-card-header="headerSlotProps['data-card-header']">
                            <!--                            <widget-label-context-by-props-->
                            <!--                                :field-set-tabular-inline="fieldSetTabularInline"-->
                            <!--                                :field-value-path="`${fieldSetTabularInline.fieldSetContext.state.name}[${headerSlotProps.rowIndex || '0'}].${headerSlotProps.field.fieldName}`"-->
                            <!--                                :row-index="headerSlotProps.rowIndex"-->
                            <!--                                v-bind="headerSlotProps"-->
                            <!--                            />-->
                        </div>
                    </slot>
                </template>
                <template #[`field(item-action-bar)`]="objectGridFieldSlotProps">
                    <!-- @slot [item-action-bar] Override the action bar cell rendered in each row. -->
                    <slot name="item-action-bar">
                        <div
                            v-if="fieldSetTabularInline.state.actions?.length"
                            :class="fieldSetTabularInline.theme('itemActionBar')"
                            data-qa="field-set-tabular-inline-item-action-bar"
                        >
                            <template v-for="action in fieldSetTabularInline.state.actions">
                                <template v-if="action.fieldName === 'destroy'">
                                    <!-- @slot [destroy-button, fieldset-destroy-button, field(fieldName)destroy-button] Button to delete a new (unsaved) tabular inline row. -->
                                    <slot
                                        v-if="!objectGridFieldSlotProps.pk"
                                        :action="action"
                                        :label="action.label"
                                        :name="fieldSetTabularInline.resolvedSlotNames['destroy-button'].name"
                                        :row-index="objectGridFieldSlotProps.rowIndex"
                                        :selected="
                                            fieldSetTabularInline.state.selected.includes(
                                                objectGridFieldSlotProps.rowIndex,
                                            )
                                        "
                                        :theme="fieldSetTabularInline.theme"
                                        :value="action.value"
                                        verb="destroy"
                                        @click="fieldSetTabularInline.removeObject(objectGridFieldSlotProps.rowIndex)"
                                    >
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            @click="
                                                fieldSetTabularInline.removeObject(objectGridFieldSlotProps.rowIndex)
                                            "
                                        >
                                            Delete
                                        </Button>
                                    </slot>
                                    <!-- @slot [destroy-checkbox, fieldset-destroy-checkbox, field(fieldName)destroy-checkbox] Checkbox to mark an existing tabular inline row for deletion. -->
                                    <slot
                                        v-else
                                        :action="action"
                                        :contextless="true"
                                        label="Destroy?"
                                        :model-value="
                                            fieldSetTabularInline.state.selected.includes(
                                                objectGridFieldSlotProps.rowIndex,
                                            )
                                        "
                                        :name="fieldSetTabularInline.resolvedSlotNames['destroy-checkbox'].name"
                                        :required="false"
                                        :row-index="objectGridFieldSlotProps.rowIndex"
                                        :theme="fieldSetTabularInline.theme"
                                        :value="action.value"
                                        verb="destroy"
                                        @update:model-value="
                                            (isSelected) =>
                                                fieldSetTabularInline.handleSelected(
                                                    isSelected,
                                                    objectGridFieldSlotProps.rowIndex,
                                                )
                                        "
                                    >
                                        <widget-checkbox
                                            :contextless="true"
                                            :input-id="`selected-row-${objectGridFieldSlotProps.rowIndex}`"
                                            label="Destroy?"
                                            :model-value="
                                                fieldSetTabularInline.state.selected.includes(
                                                    objectGridFieldSlotProps.rowIndex,
                                                )
                                            "
                                            name="destroy-checkbox"
                                            :required="false"
                                            size="small"
                                            :value="objectGridFieldSlotProps.rowIndex"
                                            @update:model-value="
                                                (isSelected) =>
                                                    fieldSetTabularInline.handleSelected(
                                                        isSelected,
                                                        objectGridFieldSlotProps.rowIndex,
                                                    )
                                            "
                                        />
                                    </slot>
                                </template>
                                <template v-else>
                                    <!-- @slot [item-action-button, fieldset-item-action-button, field(fieldName)item-action-button] Button for a non-destroy row action in the tabular inline. -->
                                    <slot
                                        :name="fieldSetTabularInline.resolvedSlotNames['item-action-button'].name"
                                        v-bind="{
                                            objectGridFieldSlotProps,
                                            action,
                                            fieldSetContextState: fieldSetTabularInline.fieldSetContext.state,
                                            rowValueName: `${fieldSetTabularInline.fieldSetContext.state.name}[${objectGridFieldSlotProps.rowIndex}]`,
                                            doCreate: fieldSetTabularInline.doCreate,
                                        }"
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            @click="
                                                ($event) =>
                                                    action.action({
                                                        objectGridFieldSlotProps,
                                                        action,
                                                        fieldSetContextState:
                                                            fieldSetTabularInline.fieldSetContext.state,
                                                        rowValueName: `${fieldSetTabularInline.fieldSetContext.state.name}[${objectGridFieldSlotProps.rowIndex}]`,
                                                        event: $event,
                                                        doCreate: fieldSetTabularInline.doCreate,
                                                    })
                                            "
                                        >
                                            {{ action.label }}
                                        </Button>
                                    </slot>
                                </template>
                            </template>
                        </div>
                    </slot>
                </template>
                <template
                    v-for="(fieldObj, foIndex) in fieldSetTabularInline.state.fieldObjects"
                    :key="`${fieldObj.name}-${objectGridFieldSlotProps.rowIndex}-${objectGridFieldSlotProps.columnIndex}`"
                    #[`field(${fieldObj.name})`]="objectGridFieldSlotProps"
                >
                    <a
                        v-if="foIndex === 0"
                        :id="`field-set-tabular-inline-anchor-${fieldObj.name}-${objectGridFieldSlotProps.rowIndex}`"
                        :ref="(el) => fieldSetTabularInline.refFn(el)"
                        data-qa="field-set-tabular-inline-anchor"
                        :data-row-index="objectGridFieldSlotProps.rowIndex"
                    />
                    <field-renderer
                        :field-props="fieldSetTabularInline.state.computedFieldProps"
                        :form-model="fieldSetTabularInline.formModel"
                        :form-model-name="fieldObj.name"
                        :object-grid-field-slot-props="objectGridFieldSlotProps"
                        v-bind="{ doCreate: fieldSetTabularInline.doCreate }"
                    >
                        <template
                            v-for="slotName in fieldSetTabularInline.state.remainingSlotNames"
                            #[slotName]="slotProps"
                        >
                            <slot :name="slotName" v-bind="slotProps" />
                        </template>
                    </field-renderer>
                </template>

                <template #row-after-objects="slotProps">
                    <div
                        v-if="
                            !fieldSetTabularInline.state.isTable &&
                            !fieldSetTabularInline.state.computedFieldProps.readOnly &&
                            fieldSetTabularInline.state.showCreateButton
                        "
                        key="create-row"
                        :class="combineClasses(fieldSetTabularInline.theme('createButtonCard'), slotProps.class)"
                        data-qa="field-set-tabular-inline-create-row"
                        role="row"
                    >
                        <!-- @slot [create-button-inline, fieldset-create-button-inline, field(fieldName)create-button-inline] Inline create button shown as a card-layout row. -->
                        <slot
                            :class="fieldSetTabularInline.theme('inLineCreateButton')"
                            :field-props="fieldSetTabularInline.state.computedFieldProps"
                            label="Create"
                            :name="fieldSetTabularInline.resolvedSlotNames['create-button-inline'].name"
                            verb="createInline"
                            @click="fieldSetTabularInline.doCreate"
                        >
                            <Button
                                variant="ghost"
                                size="sm"
                                :class="fieldSetTabularInline.theme('inLineCreateButton')"
                                @click="fieldSetTabularInline.doCreate"
                            >
                                Create
                            </Button>
                        </slot>
                    </div>
                </template>
            </objects-grid>
        </div>
    </div>
</template>
