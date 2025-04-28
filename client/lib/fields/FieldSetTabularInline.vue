<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import FieldRenderer from "@vueda/components/FieldRenderer.vue";
import FormChores from "@vueda/components/FormChores.vue";
import ObjectsGrid from "@vueda/components/ObjectsGrid.vue";
import WidgetLabelContextByProps from "@vueda/components/WidgetLabelContextByProps.vue";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import {
    FIELD_SET_TABULAR_INLINE_EMITS,
    FIELD_SET_TABULAR_INLINE_PROPS,
    useFieldSetTabularInline,
} from "@vueda/use/useFieldSetTabularInline.js";
import { getFormChoresSlotNames } from "@vueda/utils/buildForm.js";
import WidgetCheckbox from "@vueda/widgets/WidgetCheckbox.vue";
import omit from "lodash-es/omit.js";
import Button from "primevue/button";
import Divider from "primevue/divider";
import { watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps(FIELD_SET_TABULAR_INLINE_PROPS);
const emit = defineEmits([...FIELD_SET_TABULAR_INLINE_EMITS]);
const fieldSetTabularInline = useFieldSetTabularInline({
    props,
    emit,
    slotNames: [
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
        :class="combineClasses(fieldSetTabularInline.theme('root'), $attrs.class)"
        data-qa="field-set-tabular-inline-root"
    >
        <div :class="fieldSetTabularInline.theme('inner')" data-qa="field-set-tabular-inline-inner">
            <Divider
                :pt="{
                    root: {
                        class: fieldSetTabularInline.theme('dividerRoot'),
                    },
                    content: {
                        class: fieldSetTabularInline.theme('dividerContent'),
                    },
                }"
            >
                <div v-if="fieldSetTabularInline.state.hidable" data-qa="field-set-tabular-inline-header-toggle">
                    <slot
                        :class="fieldSetTabularInline.theme('toggleButton')"
                        :field-props="fieldSetTabularInline.state.computedFieldProps"
                        :label="fieldSetTabularInline.state.internalVisible ? 'Hide' : 'Show'"
                        :name="fieldSetTabularInline.resolvedSlotNames['toggle-button'].name"
                        :verb="fieldSetTabularInline.state.internalVisible ? 'collapseDown' : 'collapseUp'"
                        @click="fieldSetTabularInline.toggleVisibility"
                    >
                        <Button
                            :class="fieldSetTabularInline.theme('toggleButton')"
                            :label="fieldSetTabularInline.state.internalVisible ? 'Hide' : 'Show'"
                            @click="fieldSetTabularInline.toggleVisibility"
                        />
                    </slot>
                </div>
                <div :class="fieldSetTabularInline.theme('title')" data-qa="field-set-tabular-inline-title">
                    <slot name="title">
                        {{ fieldSetTabularInline.fieldSetContext.state.label }}
                    </slot>
                </div>
                <div :class="fieldSetTabularInline.theme('actionBar')" data-qa="field-set-tabular-inline-action-bar">
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
                            :class="fieldSetTabularInline.theme('createButton')"
                            label="Create"
                            @click="fieldSetTabularInline.doCreate"
                        />
                    </slot>
                </div>
            </Divider>
            <slot name="field-set-level-chores">
                <form-chores :variant="null">
                    <template
                        v-for="slot in getFormChoresSlotNames(
                            fieldSetTabularInline.fieldSetContext.state.formModelName,
                        )"
                        #[slot]="formChoresSlotProps"
                    >
                        <slot :name="slot" v-bind="formChoresSlotProps" />
                    </template>
                </form-chores>
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
                    <slot :name="`header(${fieldObj.name})`" v-bind="headerSlotProps">
                        <div :class="headerSlotProps.class" :data-card-header="headerSlotProps['data-card-header']">
                            <widget-label-context-by-props
                                :field-set-tabular-inline="fieldSetTabularInline"
                                :field-value-path="`${fieldSetTabularInline.fieldSetContext.state.name}[${headerSlotProps.rowIndex || '0'}].${headerSlotProps.field.fieldName}`"
                                :row-index="headerSlotProps.rowIndex"
                                v-bind="headerSlotProps"
                            />
                        </div>
                    </slot>
                </template>
                <template #[`field(item-action-bar)`]="objectGridFieldSlotProps">
                    <slot name="item-action-bar">
                        <div
                            v-if="fieldSetTabularInline.state.actions?.length"
                            :class="fieldSetTabularInline.theme('itemActionBar')"
                            data-qa="field-set-tabular-inline-item-action-bar"
                        >
                            <template v-for="action in fieldSetTabularInline.state.actions">
                                <template v-if="action.fieldName === 'destroy'">
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
                                            label="Delete"
                                            text
                                            @click="
                                                fieldSetTabularInline.removeObject(objectGridFieldSlotProps.rowIndex)
                                            "
                                        />
                                    </slot>
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
                                            :label="action.label"
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
                                        />
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
                        <slot
                            :class="fieldSetTabularInline.theme('inLineCreateButton')"
                            :field-props="fieldSetTabularInline.state.computedFieldProps"
                            label="Create"
                            :name="fieldSetTabularInline.resolvedSlotNames['create-button-inline'].name"
                            verb="createInline"
                            @click="fieldSetTabularInline.doCreate"
                        >
                            <Button
                                :class="fieldSetTabularInline.theme('inLineCreateButton')"
                                label="Create"
                                variant="text"
                                @click="fieldSetTabularInline.doCreate"
                            />
                        </slot>
                    </div>
                </template>
            </objects-grid>
        </div>
    </div>
</template>
