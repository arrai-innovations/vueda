<script setup>
import BooleanDisplay from "@vueda/display/boolean-display/BooleanDisplay.vue";
import WidgetReadOnly from "@vueda/widgets/WidgetReadOnly.vue";
import { computed } from "vue";

/**
 * Read-only presentation for boolean fields. Wraps {@link WidgetReadOnly} so the row keeps
 * its label association, theme slots, and lookup behavior, and fills the value with
 * {@link BooleanDisplay} instead of the raw serialized literal.
 *
 * `fieldMappings` selects this widget through `readOnlyWidget` and supplies the per-type
 * labels through `readOnlyWidgetProps`, so a project that says "Enabled" and "Disabled"
 * sets them once in its own mapping rather than per field.
 *
 * `options` label individual values. `buildForm` passes the field's `displayChoices`. When the
 * field has no `displayChoices`, it passes the field's `choices`, if those are a static list. The label of the option that matches the value replaces the true or false word,
 * or the dash for a null value.
 *
 * A consumer's own `default` slot still wins: this widget supplies the boolean rendering
 * only when the field has no `widget(fieldName)default` override.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    /** Word shown for a true value. */
    trueLabel: {
        type: String,
        default: "Yes",
    },
    /** Word shown for a false value. */
    falseLabel: {
        type: String,
        default: "No",
    },
    /**
     * Labels for stored values, as `{ label, value }` entries. A matching entry's label replaces the word.
     * `false` means the field has no labels. `buildForm` passes `false` for a field without choices.
     */
    options: {
        type: [Array, Boolean],
        default: false,
    },
});

const choiceOptions = computed(() => (Array.isArray(props.options) ? props.options : []));
</script>

<template>
    <widget-read-only v-bind="$attrs" :options="options">
        <template v-for="slotName in Object.keys($slots)" #[slotName]="slotProps">
            <slot :name="slotName" v-bind="slotProps || {}" />
        </template>
        <template v-if="!$slots.default" #default="{ rawValue }">
            <boolean-display
                :false-label="falseLabel"
                :options="choiceOptions"
                :true-label="trueLabel"
                :value="rawValue"
                inline
            />
        </template>
    </widget-read-only>
</template>
