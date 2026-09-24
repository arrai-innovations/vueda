<script setup>
import Button from "@vueda/controls/button/Button.vue";
import FieldDescription from "@vueda/shell/field/FieldDescription.vue";
import FieldMessage from "@vueda/shell/field/FieldMessage.vue";
import "@vueda/theme/vueda-tailwind/form/FieldSetMany.theme.js";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { FIELD_EMITS, FIELD_PROPS, useField } from "@vueda/use/useField.js";
import { ICON_OVERRIDE_PROPS, useIcons } from "@vueda/use/useIcons.js";
import { THEME_OVERRIDE_PROPS, useTheme } from "@vueda/use/useTheme.js";
import { watchIfDev } from "@vueda/utils/dev.js";
import { FormContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject, unref, useAttrs } from "vue";

/**
 * A field that manages a list of values by rendering one instance of
 * `manyComponent` per entry. Provides Add and Remove buttons so users can
 * grow or shrink the list. Every entry can be removed. Required lists need at
 * least one entry; optional lists may be empty. Added entries require a value.
 */
defineOptions({});

const attrs = useAttrs();
const props = defineProps({
    ...ICON_OVERRIDE_PROPS,
    ...FIELD_PROPS,
    /** Checks whether the list violates its required rule; defaults to rejecting missing or empty arrays. */
    isRequiredViolation: {
        type: Function,
        default: (value) => !Array.isArray(value) || value.length === 0,
    },
    /** The component used to render each individual entry in the list. */
    manyComponent: {
        type: Object,
        required: true,
    },
    ...THEME_OVERRIDE_PROPS,
});
const emit = defineEmits([...FIELD_EMITS]);

/** @type {import('@vueda/use/useForm.js').FormContext|null} */
const providedFormContext = inject(FormContextSymbol, null);
const formContext = computed(() => (props.contextless ? null : unref(providedFormContext)));
const fieldContext = useField(props, emit);
const logger = useDevLogger({ fieldContext });

const fieldProps = computed(() => {
    const values = fieldContext.state.value;
    const indexes = Array.isArray(values) ? values.map((_, index) => index) : [];
    return indexes.map((index) => ({
        ...props,
        ...attrs,
        name: `${fieldContext.state.name}[${index}]`,
        label: `${fieldContext.state.label} ${index + 1}`,
        help: "",
        required: true,
        shouldRequireFn: null,
        // The list's required rule does not apply to a scalar entry. False and
        // zero are values, not empty entries, for boolean and numeric lists.
        isRequiredViolation: (value) => value === null || value === undefined || value === "",
        modelValue: values[index],
        "onUpdate:modelValue": (value) => {
            if (fieldContext.state.readOnly) {
                return;
            }
            const next = [...fieldContext.state.value];
            next[index] = value;
            fieldContext.state.value = next;
        },
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
    if (fieldContext.state.readOnly) {
        return;
    }
    fieldContext.blur();
    fieldContext.state.value = [...(fieldContext.state.value ?? []), undefined];
};

const onDestroy = (index) => {
    const values = fieldContext.state.value;
    if (fieldContext.state.readOnly || !Array.isArray(values) || index < 0 || index >= values.length) {
        return;
    }
    fieldContext.blur();

    if (formContext.value) {
        formContext.value.removeArrayItem(fieldContext.state.name, index);
    } else {
        fieldContext.state.value = values.filter((_, i) => i !== index);
    }
};
const theme = useTheme("FieldSetMany", props);
const icon = useIcons("FieldSetMany", props);
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
            <div v-if="fieldProps.length" :class="theme('rows')">
                <template v-for="(fieldProp, index) in fieldProps" :key="index">
                    <!-- @slot [field(fieldName)] Override the rendered row for a specific field entry. -->
                    <slot :name="`field(${fieldProp.name})`" v-bind="{ fieldProps, index }">
                        <div :class="theme('row')" data-qa="field-set-many-row">
                            <div :class="theme('component')">
                                <component :is="props.manyComponent" v-bind="fieldProp">
                                    <slot :hidden="true" />
                                </component>
                            </div>
                            <div :class="theme('removeButton')" data-qa="field-set-many-remove">
                                <!-- @slot [destroy] Override the delete button for a row. The slot receives `onClick`, `disabled`, and `index` as slot props; removal is disabled when the field is read-only. -->
                                <slot
                                    name="destroy"
                                    :disabled="fieldContext.state.readOnly"
                                    :index="index"
                                    @click="onDestroy(index)"
                                >
                                    <Button
                                        type="button"
                                        tone="destructive"
                                        emphasis="ghost"
                                        size="icon-sm"
                                        :disabled="fieldContext.state.readOnly"
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
                <slot name="add" :disabled="fieldContext.state.readOnly" @click="onAdd">
                    <Button
                        type="button"
                        emphasis="outline"
                        size="sm"
                        :disabled="fieldContext.state.readOnly"
                        @click="onAdd"
                    >
                        <component
                            :is="icon('plus').component"
                            v-if="icon('plus')"
                            v-bind="icon('plus').props"
                            aria-hidden="true"
                        />
                        <span v-else aria-hidden="true" class="select-none">+</span>
                        Add
                    </Button>
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
