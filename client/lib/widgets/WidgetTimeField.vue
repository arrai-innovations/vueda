<script setup>
import { parseTime } from "@internationalized/date";
import TimeField from "@vueda/controls/time-field/TimeField.vue";
import TimeFieldInput from "@vueda/controls/time-field/TimeFieldInput.vue";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * A time picker widget using segment-based input. Users tab through hour,
 * minute, and optional second segments. No calendar popover is shown since
 * this handles time-only values.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...WIDGET_PROPS,
    /** The granularity of the time field ("hour", "minute", or "second"). */
    granularity: { type: String, default: "minute" },
    /** The minimum selectable time (@internationalized/date Time object). */
    minValue: { type: Object, default: undefined },
    /** The maximum selectable time (@internationalized/date Time object). */
    maxValue: { type: Object, default: undefined },
    /** The locale used for formatting time segments. */
    locale: { type: String, default: undefined },
    /** The hour cycle for time formatting (12 or 24). */
    hourCycle: { type: Number, default: undefined },
});

const emit = defineEmits([...WIDGET_EMITS]);

/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);

/**
 * @param {string|null|undefined} raw
 * @returns {import('@internationalized/date').Time|undefined}
 */
function parseTimeValue(raw) {
    if (!raw) {
        return undefined;
    }
    try {
        return parseTime(raw);
    } catch {
        return undefined;
    }
}

const timeValue = computed({
    get: () => parseTimeValue(widgetContext.state.combinedValue),
    set: (v) => {
        widgetContext.state.combinedValue = v?.toString() ?? null;
    },
});
</script>

<template>
    <TimeField
        :id="fieldContext?.state.fieldId"
        v-model="timeValue"
        :granularity="granularity"
        :min-value="minValue"
        :max-value="maxValue"
        :locale="locale"
        :hour-cycle="hourCycle"
        :disabled="widgetContext.state.disabled"
        :name="widgetContext.state.combinedName"
        :aria-invalid="widgetContext.state.validationState.invalid || undefined"
        :data-warning="widgetContext.state.validationState.warning || undefined"
        :aria-required="widgetContext.state.required || undefined"
        v-bind="$attrs"
        data-qa="widget-time-field"
        class="items-center"
        @blur="widgetContext.blur"
        @focus="widgetContext.focus"
    >
        <template #default="{ segments }">
            <template v-for="segment in segments" :key="segment.part">
                <TimeFieldInput v-if="segment.part === 'literal'" :part="segment.part" class="text-muted-foreground">{{
                    segment.value
                }}</TimeFieldInput>
                <TimeFieldInput v-else :part="segment.part">{{ segment.value }}</TimeFieldInput>
            </template>
        </template>
    </TimeField>
</template>
