<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import { useFilteredAttrs } from "@vueda/use/useFilteredAttrs.js";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS, useWarningClass } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import { knownDatePickerProps } from "@vueda/utils/primevueConsts.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import pick from "lodash-es/pick.js";
import { DateTime } from "luxon";
import DatePicker from "primevue/datepicker";
import { computed, nextTick, ref, unref, useSlots } from "vue";

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
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);
const theme = useWidgetTheme("WidgetDatePicker", props, widgetContext.state);
const effectivePt = useWarningClass(props, widgetContext.state);
const valueIsArray = computed(() => Array.isArray(widgetContext.state.combinedValue));
const computedSelectionMode = computed(() =>
    props.selectionMode ? props.selectionMode : valueIsArray.value ? "range" : "single",
);
const unvalidatedInput = ref(null);
const debounceTimeout = ref(null);
const DEBOUNCE_DELAY = 1000;
const modelValue = computed(() => {
    return unvalidatedInput.value ?? widgetContext.state.combinedValue ?? null;
});
const valueUpdated = (value) => {
    if (unvalidatedInput.value) {
        unvalidatedInput.value = null;
    }
    widgetContext.state.combinedValue = value;
};
const onTodayButtonClick = () => {
    widgetContext.state.combinedValue = getCurrentDate();
};

const getCurrentDate = () => {
    return new Date();
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
        valueUpdated(null);
        return;
    }
    try {
        const parsedDate = parseInputToModel(value, type);
        valueUpdated(parsedDate);
    } catch (error) {
        console.warn("Invalid input:", error.message);
    }
};
const onInput = (e) => {
    const value = e.target.value;
    unvalidatedInput.value = value;
    if (debounceTimeout.value) {
        clearTimeout(debounceTimeout.value);
    }
    debounceTimeout.value = setTimeout(() => {
        try {
            normalizeAndUpdate(value, inputType.value);
        } catch (error) {
            console.warn("Invalid input during typing:", error.message);
        } finally {
            debounceTimeout.value = null;
        }
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
    return props.minDate ? DateTime.fromFormat(props.minDate, "yyyy-MM-dd").toJSDate() : undefined;
});
const maxDateAsDate = computed(() => {
    return props.maxDate ? DateTime.fromFormat(props.maxDate, "yyyy-MM-dd").toJSDate() : undefined;
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
                        v-bind="datePickerAttrs"
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
                        :model-value="modelValue"
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
                        @update:model-value="(value) => valueUpdated(value)"
                    />
                </div>
            </template>
        </widget-label>
    </div>
</template>
