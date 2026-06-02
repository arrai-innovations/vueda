<script setup>
import Button from "@vueda/controls/button/Button.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldMessage from "@vueda/shell/field/FieldMessage.vue";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { watchIfDev } from "@vueda/utils/dev.js";
import { computed, useAttrs } from "vue";

/**
 * A field that manages a list of values by rendering one instance of
 * `manyComponent` per entry. Provides Add and Remove buttons so users can
 * grow or shrink the list, and the first entry is always required while
 * subsequent entries are optional.
 */
defineOptions({});

const attrs = useAttrs();
const props = defineProps({
    ...FIELD_PROPS,
    /** The component used to render each individual entry in the list. */
    manyComponent: {
        type: Object,
        required: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);

const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });

const fieldProps = computed(() => {
    const values = fieldContext.state.value;
    const indexes = Array.isArray(values) && values.length ? values.map((_, index) => index) : [0];
    return indexes.map((index) => ({
        ...props,
        ...attrs,
        name: `${fieldContext.state.name}[${index}]`,
    }));
});

watchIfDev(
    () => fieldContext.state.value,
    (value) => {
        if (value !== null && value !== undefined && !Array.isArray(value)) {
            logger.warn(`Expected value to be an array or null/undefined, got:`, value);
        }
    },
    { immediate: true },
);

const onAdd = () => {
    fieldContext.state.value = [...(fieldContext.state.value ?? []), undefined];
};

const onDestroy = (index) => {
    fieldContext.state.value = (fieldContext.state.value ?? []).filter((_, i) => i !== index);
};
const theme = useTheme("FieldSetMany", props);
const icon = useIcons("FieldSetMany");
</script>
<template>
    <div :class="theme('root')" :style="theme.hideStyle?.value" data-qa="field-set-many" data-vueda-fieldset>
        <div :class="theme('inner')">
            <div :class="theme('header')">
                <!-- @slot [label] Override the field label. -->
                <slot :field-label="fieldContext.state.label" :field-name="fieldContext.state.name" name="label">
                    <label :class="theme('label')" :for="fieldContext.state.name">
                        {{ fieldContext.state.label }}
                    </label>
                </slot>
            </div>
            <div v-if="fieldProps?.length">
                <template v-for="(fieldProp, index) in fieldProps" :key="index">
                    <!-- @slot [field(fieldName)] Override the rendered row for a specific field entry. -->
                    <slot :name="`field(${fieldProp.name})`" v-bind="{ fieldProps, index }">
                        <div :class="theme('row')" data-qa="field-set-many-row">
                            <div :class="theme('component')">
                                <component :is="props.manyComponent" v-bind="fieldProp" :required="index > 0">
                                    <slot :hidden="true" />
                                </component>
                            </div>
                            <div :class="theme('removeButton')" data-qa="field-set-many-remove">
                                <!-- @slot [destroy] Override the delete button for a row. The slot receives `onClick`, `disabled`, and `index` as slot props; the first entry's remove is disabled rather than hidden. -->
                                <slot name="destroy" :disabled="index === 0" :index="index" @click="onDestroy(index)">
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        :disabled="index === 0"
                                        @click="onDestroy(index)"
                                    >
                                        <component
                                            :is="icon('close').component"
                                            v-if="icon('close')"
                                            v-bind="icon('close').props"
                                            aria-hidden="true"
                                        />
                                        <span class="sr-only">Remove entry</span>
                                    </Button>
                                </slot>
                            </div>
                        </div>
                    </slot>
                </template>
            </div>
            <div :class="theme('footer')" data-qa="field-set-many-footer">
                <!-- @slot [add] Override the add button. -->
                <slot name="add" @click="onAdd">
                    <Button variant="outline" size="sm" @click="onAdd"
                        ><span aria-hidden="true" class="select-none">+</span> Add</Button
                    >
                </slot>
            </div>
            <!-- @slot [field-set-level-chores] Override the validation block (help, errors, warnings) for this field set. -->
            <slot name="field-set-level-chores">
                <FieldDescription v-if="fieldContext.state.help">
                    {{ fieldContext.state.help }}
                </FieldDescription>
                <FieldMessage :messages="Object.values(fieldContext.state.errors)" />
                <FieldMessage
                    v-if="Object.keys(fieldContext.state.messages).length"
                    severity="warning"
                    :messages="Object.values(fieldContext.state.messages)"
                />
            </slot>
        </div>
    </div>
</template>
