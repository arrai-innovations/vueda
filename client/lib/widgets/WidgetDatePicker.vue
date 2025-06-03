<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { useDevLogger } from "@vueda/use/useDevLogger.js";
import { useFilteredAttrs } from "@vueda/use/useFilteredAttrs.js";
import { useIsActive } from "@vueda/use/useIsActive.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { knownDatePickerProps } from "@vueda/utils/primevueConsts.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import isEqual from "lodash-es/isEqual.js";
import pick from "lodash-es/pick.js";
import { DateTime } from "luxon";
import DatePicker from "primevue/datepicker";
import { computed, nextTick, onMounted, reactive, ref, toRefs, unref, useSlots, useTemplateRef, watch } from "vue";

// we use these formats to handle unvalidated input.
// unvalidated input is a workaround of datepicker not dealing with manual input well.
const formats = {
    time: [
        "h:mm a", // 9:11 AM
        "hh:mm a", // 09:11 AM
        "H:mm", // 21:11
        "HH:mm", // 09:11 in 24-hour format
        "HHmm", // 0911 in 24-hour format
        "h a", // 9 AM
        "hh a", // 09 AM
        "H", // 21
        "HH", // 09 in 24-hour format
    ],
    date: [
        "yyyy-MM-dd", // 2023-12-01
    ],
    datetime: [
        "yyyy-MM-dd HH:mm", // 2023-12-01 21:11
        "yyyy-MM-dd h:mm a", // 2023-12-01 9:11 AM
    ],
};

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    selectionMode: {
        type: String,
        default: undefined,
    },
    minDate: {
        type: String,
        default: undefined,
    },
    maxDate: {
        type: String,
        default: undefined,
    },
    customDateConverter: {
        type: Function,
        default: undefined,
    },
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const datepickerRef = useTemplateRef("datepickerRef");
const emit = defineEmits([...WIDGET_EMITS]);
const safeParseISO = (value) => {
    if (!value) return null;
    const dt = DateTime.fromISO(value, { zone: "local" });
    return dt.isValid ? dt.toJSDate() : null;
};
const widgetProps = reactive({
    ...toRefs(props),
    fieldToWidget: (fieldValue) => {
        if (!fieldValue) {
            return null;
        }
        if (props.selectionMode === "range" || props.selectionMode === "daterange") {
            if (typeof fieldValue === "object" && !Array.isArray(fieldValue)) {
                return [
                    fieldValue.lower ? safeParseISO(fieldValue.lower) : null,
                    fieldValue.upper ? safeParseISO(fieldValue.upper) : null,
                ];
            }
            if (Array.isArray(fieldValue)) {
                return fieldValue.map((v) => (v ? safeParseISO(v) : null));
            }
            return [null, null];
        }
        return safeParseISO(fieldValue);
    },
    widgetToField: (widgetValue) => {
        if (!widgetValue) {
            return null;
        }
        const convert = props.customDateConverter || ((v) => v);
        if (props.selectionMode === "range" || props.selectionMode === "daterange") {
            return {
                lower: widgetValue[0]
                    ? DateTime.fromJSDate(convert(widgetValue[0]), { zone: "local" }).toISODate()
                    : null,
                upper: widgetValue[1]
                    ? DateTime.fromJSDate(convert(widgetValue[1]), { zone: "local" }).toISODate()
                    : null,
            };
        }

        return widgetValue ? DateTime.fromJSDate(convert(widgetValue), { zone: "local" }).toISODate() : null;
    },
});
const widgetContext = useWidget(widgetProps, emit);
const theme = useWidgetTheme("WidgetDatePicker", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const inputIsDirty = ref(false);
const valueIsArray = computed(() => Array.isArray(widgetContext.state.combinedValue));
const computedSelectionMode = computed(() =>
    props.selectionMode ? props.selectionMode : valueIsArray.value ? "range" : "single",
);
const unvalidatedInput = ref(null);
const debounceTimeout = ref(null);
const DEBOUNCE_DELAY = 1000;
const isActive = useIsActive();

const modelValue = computed({
    get() {
        if (!isActive.value) {
            return null;
        }
        if (inputIsDirty.value && unvalidatedInput.value !== null) {
            return unvalidatedInput.value;
        }
        return widgetContext.state.adaptedValue ?? null;
    },
    set(newValue) {
        if (typeof newValue === "string") {
            unvalidatedInput.value = newValue;
            inputIsDirty.value = true;
        } else {
            widgetContext.state.adaptedValue = newValue;
            inputIsDirty.value = false;
            unvalidatedInput.value = null;
        }
    },
});
const valueUpdated = (value) => {
    unvalidatedInput.value = null;
    inputIsDirty.value = false;
    if (!isEqual(value, widgetContext.state.adaptedValue)) {
        widgetContext.state.adaptedValue = value;
    }
};
const onTodayButtonClick = () => {
    unvalidatedInput.value = null;
    const dpAttrs = unref(datePickerAttrs);
    const showTime = dpAttrs.showTime ?? false;
    const timeOnly = dpAttrs.timeOnly ?? false;
    const newDate = new Date();

    if (showTime || timeOnly) {
        const currentHour = Math.floor(newDate.getHours() / (dpAttrs.stepHour ?? 1)) * (dpAttrs.stepHour ?? 1);
        const currentMinute = Math.floor(newDate.getMinutes() / (dpAttrs.stepMinute ?? 1)) * (dpAttrs.stepMinute ?? 1);
        const currentSecond = Math.floor(newDate.getSeconds() / (dpAttrs.stepSecond ?? 1)) * (dpAttrs.stepSecond ?? 1);
        newDate.setHours(currentHour, currentMinute, currentSecond, 0);
    }
    widgetContext.state.combinedValue = newDate;
};

const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
const datePickerAttrs = useFilteredAttrs(knownDatePickerProps, [
    "clearButtonProps",
    "disabled",
    "inputId",
    "invalid",
    "maxDate", // these are broken when passed via attrs, the js date objects become empty objects
    "minDate", // these are broken when passed via attrs, the js date objects become empty objects
    "modelValue",
    "name",
    "onBlur",
    "onFocus",
    "onTodayClick",
    "onUpdate:modelValue",
    "pt",
    "selectionMode",
    "showButtonBar",
    "todayButtonProps",
]);
const inputType = computed(() => {
    const dpAttrs = unref(datePickerAttrs);
    const showTime = dpAttrs.showTime ?? false;
    const timeOnly = dpAttrs.timeOnly ?? false;
    if (dpAttrs.selectionMode === "range") {
        // todo: handle ranges
        return "datetime";
    } else if (showTime && !timeOnly) {
        return "datetime";
    } else if (showTime || timeOnly) {
        return "time";
    } else {
        return "date";
    }
});
const parseInputToModel = (input, type = "datetime") => {
    const typeFormats = formats[type] || [];
    let parsedDate = null;
    for (const format of typeFormats) {
        parsedDate = DateTime.fromFormat(input, format, { locale: "en" });
        if (parsedDate.isValid) {
            return parsedDate.toJSDate();
        }
    }
    throw new Error("Invalid input format");
};
const normalizeAndUpdate = (value, type = "datetime") => {
    if (!value || !value.trim()) {
        inputIsDirty.value = false;
        valueUpdated(null);
        return;
    }
    try {
        const parsedDate = parseInputToModel(value, type);
        inputIsDirty.value = false;
        valueUpdated(parsedDate);
    } catch (error) {
        console.warn("Invalid input format:", error.message);
        // Still in unvalidated input
        inputIsDirty.value = true;
    }
};
const onInput = (e) => {
    const value = e.target.value;
    inputIsDirty.value = true;
    unvalidatedInput.value = value;
    if (debounceTimeout.value) {
        clearTimeout(debounceTimeout.value);
    }
    debounceTimeout.value = setTimeout(() => {
        normalizeAndUpdate(value, inputType.value);
    }, DEBOUNCE_DELAY);
};

const onBlur = (e) => {
    const value = e.value;
    try {
        normalizeAndUpdate(value, inputType.value);
    } catch (error) {
        console.warn("Invalid input on blur:", error.message);
    }
    nextTick(() => {
        widgetContext.blur();
        if (unvalidatedInput.value) {
            unvalidatedInput.value = null;
        }
    });
};
const minDateAsDate = computed(() => {
    return props.minDate ? DateTime.fromFormat(props.minDate, "yyyy-MM-dd", { zone: "utc" }).toJSDate() : undefined;
});
const maxDateAsDate = computed(() => {
    return props.maxDate ? DateTime.fromFormat(props.maxDate, "yyyy-MM-dd", { zone: "utc" }).toJSDate() : undefined;
});
</script>
<template>
    <div :class="theme('root')" data-qa="widget-date-picker-root">
        <widget-label :for="widgetContext.state.widgetId" v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))">
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)" data-qa="widget-date-picker-inner">
                    <DatePicker
                        ref="datepickerRef"
                        v-bind="datePickerAttrs"
                        :model-value="modelValue"
                        @update:model-value="valueUpdated"
                        :clear-button-props="{
                            label: `Clear`,
                            outlined: true,
                            text: true,
                        }"
                        :default-value="null"
                        :disabled="widgetContext.state.disabled"
                        :input-id="widgetContext.state.widgetId"
                        :invalid="widgetContext.state.validationState.invalid"
                        :max-date="maxDateAsDate"
                        :min-date="minDateAsDate"
                        :name="widgetContext.state.combinedName"
                        :pt="effectivePt"
                        :selection-mode="computedSelectionMode"
                        show-button-bar
                        :today-button-props="{
                            label: `Now`,
                            outlined: true,
                            text: true,
                        }"
                        @blur="onBlur"
                        @focus="widgetContext.focus"
                        @input="onInput"
                        @today-click="onTodayButtonClick"
                        :aria-required="widgetContext.state.required"
                    />
                </div>
            </template>
        </widget-label>
    </div>
</template>
