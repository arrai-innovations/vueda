<script setup>
import { parseTime } from "@internationalized/date";
import { ControlTimeField, ControlTimeFieldInput } from "@vueda/controls/time-field";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { computed, inject } from "vue";

/**
 * A time range picker widget that renders two segment-based time inputs for
 * start and end values. Converts between the field's { lower, upper } object
 * format and @internationalized/date Time objects.
 */
defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    ...WIDGET_PROPS,
    /** The granularity of the time fields ("hour", "minute", or "second"). */
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
    if (!raw) return undefined;
    try {
        return parseTime(raw);
    } catch {
        return undefined;
    }
}

/**
 * @param {'lower'|'upper'} key
 * @returns {import('vue').WritableComputedRef<import('@internationalized/date').Time|undefined>}
 */
function useBoundaryValue(key) {
    return computed({
        get: () => {
            const raw = widgetContext.state.combinedValue;
            if (!raw || typeof raw !== "object") return undefined;
            return parseTimeValue(raw[key]);
        },
        set: (v) => {
            const current = widgetContext.state.combinedValue ?? {};
            widgetContext.state.combinedValue = {
                ...current,
                [key]: v?.toString() ?? null,
            };
        },
    });
}

const startValue = useBoundaryValue("lower");
const endValue = useBoundaryValue("upper");
</script>

<template>
    <div class="flex items-center gap-2" data-qa="widget-time-range-field" v-bind="$attrs">
        <ControlTimeField
            :id="fieldContext?.state.fieldId"
            v-model="startValue"
            :granularity="granularity"
            :min-value="minValue"
            :max-value="maxValue"
            :locale="locale"
            :hour-cycle="hourCycle"
            :disabled="widgetContext.state.disabled"
            :name="widgetContext.state.combinedName ? widgetContext.state.combinedName + '_lower' : undefined"
            :aria-invalid="widgetContext.state.validationState.invalid || undefined"
            :aria-required="widgetContext.state.required || undefined"
            class="items-center"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        >
            <template #default="{ segments }">
                <template v-for="segment in segments" :key="'start-' + segment.part">
                    <ControlTimeFieldInput
                        v-if="segment.part === 'literal'"
                        :part="segment.part"
                        class="text-muted-foreground"
                    />
                    <ControlTimeFieldInput v-else :part="segment.part" />
                </template>
            </template>
        </ControlTimeField>
        <span class="text-muted-foreground" aria-hidden="true">&ndash;</span>
        <ControlTimeField
            v-model="endValue"
            :granularity="granularity"
            :min-value="minValue"
            :max-value="maxValue"
            :locale="locale"
            :hour-cycle="hourCycle"
            :disabled="widgetContext.state.disabled"
            :name="widgetContext.state.combinedName ? widgetContext.state.combinedName + '_upper' : undefined"
            class="items-center"
            @blur="widgetContext.blur"
            @focus="widgetContext.focus"
        >
            <template #default="{ segments }">
                <template v-for="segment in segments" :key="'end-' + segment.part">
                    <ControlTimeFieldInput
                        v-if="segment.part === 'literal'"
                        :part="segment.part"
                        class="text-muted-foreground"
                    />
                    <ControlTimeFieldInput v-else :part="segment.part" />
                </template>
            </template>
        </ControlTimeField>
    </div>
</template>
