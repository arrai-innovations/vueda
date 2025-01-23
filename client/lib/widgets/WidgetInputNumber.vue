<script setup>
import { combineClasses } from "@arrai-innovations/reactive-helpers";
import EmptyComponent from "@vueda/components/EmptyComponent.vue";
import { THEME_OVERRIDE_PROPS } from "@vueda/use/useTheme.js";
import { PASSTHROUGH_OPTION_PROPS } from "@vueda/use/useWarningClass.js";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { useWidgetTheme } from "@vueda/use/useWidgetTheme.js";
import WidgetLabel, { WIDGET_LABEL_PROPS, getWidgetSlotsComputed } from "@vueda/widgets/WidgetLabel.vue";
import isEqual from "lodash-es/isEqual.js";
import isObject from "lodash-es/isObject.js";
import omit from "lodash-es/omit.js";
import pick from "lodash-es/pick.js";
import Button from "primevue/button";
import InputGroup from "primevue/inputgroup";
import InputGroupAddon from "primevue/inputgroupaddon";
import Popover from "primevue/popover";
import { computed, onMounted, ref, toRef, useSlots, useTemplateRef, watch } from "vue";

defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    ...WIDGET_LABEL_PROPS,
    ...THEME_OVERRIDE_PROPS,
    ...PASSTHROUGH_OPTION_PROPS,
    min: {
        type: [Number, Object],
        default: undefined,
    },
    max: {
        type: [Number, Object],
        default: undefined,
    },
    step: {
        type: [Number, Object],
        default: undefined,
    },
    unit: {
        type: [String, Array],
        default: undefined,
    },
});
const emit = defineEmits([...WIDGET_EMITS]);
const widgetContext = useWidget(props, emit);

const theme = useWidgetTheme("WidgetInputNumber", props, widgetContext.state);
const slots = useSlots();
const availableLabelSlotNames = getWidgetSlotsComputed(slots);
const allowMinusSign = computed(() => {
    return props.min === undefined || props.min < 0;
});
const min = toRef(props, "min");
const max = toRef(props, "max");
const step = toRef(props, "step");

const widgetMin = computed(() => {
    if (min.value) {
        if (isObject(min.value)) {
            return min.value[currentUnit.value?.value] || 0;
        }
    }
    return min.value;
});

const widgetMax = computed(() => {
    if (max.value) {
        if (isObject(max.value)) {
            return max.value[currentUnit.value?.value] || 0;
        }
    }
    return max.value;
});

const widgetStep = computed(() => {
    if (step.value) {
        if (isObject(step.value)) {
            return step.value[currentUnit.value?.value] || 0;
        }
    }
    return step.value;
});
const onInputKeyDown = (event) => {
    const char = event.key;
    const isMinusSign = char === "-";
    if (isMinusSign && !allowMinusSign.value) {
        event.preventDefault();
        return false;
    }
};

const onPaste = (event) => {
    const data = (event.clipboardData || window["clipboardData"]).getData("Text");
    if (data) {
        if (!allowMinusSign.value && data.includes("-")) {
            // This mimic the behavior of primevue inputnumber, but is this the best way to handle this?
            event.preventDefault();
        }
    }
};

const popoverRef = useTemplateRef("popoverRef");
const doToggle = (event) => {
    if (event) {
        event.preventDefault();
    }
    if (popoverRef.value) {
        popoverRef.value.toggle(event);
    }
};
const currentUnit = ref(null);
onMounted(() => {
    inputValue.value = widgetContext.state.combinedValue;
    if (props.unit) {
        if (Array.isArray(props.unit)) {
            currentUnit.value = props.unit[0];
        } else {
            currentUnit.value = props.unit;
        }
    }
});
watch(toRef(props, "unit"), (newVal, oldVal) => {
    if (newVal && !isEqual(newVal, oldVal)) {
        if (Array.isArray(newVal)) {
            currentUnit.value = newVal[0];
        } else {
            currentUnit.value = newVal;
        }
    }
});

const onPrevButtonClicked = () => {
    const currentUnitValue = currentUnit.value?.value;
    const currentIndex = props.unit.findIndex((item) => item.value === currentUnitValue);
    if (currentIndex === 0) {
        currentUnit.value = props.unit[props.unit.length - 1];
    } else if (currentIndex === -1) {
        return;
    } else {
        currentUnit.value = props.unit[currentIndex - 1];
    }
};

const onNextButtonClicked = () => {
    const currentUnitValue = currentUnit.value?.value;
    const currentIndex = props.unit.findIndex((item) => item.value === currentUnitValue);
    if (currentIndex === props.unit.length - 1) {
        currentUnit.value = props.unit[0];
    } else if (currentIndex === -1) {
        return;
    } else {
        currentUnit.value = props.unit[currentIndex + 1];
    }
};

const inputValue = ref(null);

watch([inputValue, currentUnit], ([value, unit], [oldValue, oldUnit]) => {
    if (!isEqual(value, oldValue) || !isEqual(unit, oldUnit)) {
        if (unit) {
            widgetContext.state.combinedValue = { value: value, unit: unit.value };
        } else {
            widgetContext.state.combinedValue = value;
        }
    }
});
</script>

<template>
    <div :class="theme('root')" data-qa="widget-label-root">
        <widget-label :for="widgetContext.state.widgetId" v-bind="pick(props, Object.keys(WIDGET_LABEL_PROPS))">
            <template v-for="slotName in availableLabelSlotNames" :key="slotName" #[slotName]="slotProps">
                <slot :name="slotName" v-bind="slotProps" />
            </template>
            <template #default="{ class: labelControlClass }">
                <div :class="combineClasses(theme('inner'), labelControlClass)" data-qa="widget-input-inner">
                    <component :is="$slots.prefix || $slots.suffix || props.unit ? InputGroup : EmptyComponent">
                        <slot v-if="$slots.prefix" name="prefix" />
                        <input
                            :id="widgetContext.state.widgetId"
                            v-model="inputValue"
                            :aria-invalid="widgetContext.state.validationState.invalid"
                            :class="theme('input')"
                            :disabled="widgetContext.state.disabled"
                            :max="widgetMax"
                            :min="widgetMin"
                            :name="widgetContext.state.combinedName"
                            :step="widgetStep"
                            v-bind="omit($attrs, 'value')"
                            type="number"
                            @blur="widgetContext.blur"
                            @focus="widgetContext.focus"
                            @keydown="onInputKeyDown"
                            @paste="onPaste"
                        />
                        <InputGroupAddon v-if="currentUnit">
                            <Button :label="currentUnit.label" unstyled variant="text" @click="doToggle"> </Button
                        ></InputGroupAddon>
                        <Popover v-if="currentUnit?.label" ref="popoverRef">
                            <div :class="theme('formPopoverInner')">
                                <slot name="prev-button" @click="onPrevButtonClicked">
                                    <Button unstyled @click="onPrevButtonClicked">
                                        <template #icon> ⬅️ </template>
                                    </Button>
                                </slot>
                                <span class="p-1">
                                    {{ currentUnit.label }}
                                </span>
                                <slot name="next-button" @click="onNextButtonClicked">
                                    <Button unstyled @click="onNextButtonClicked">
                                        <template #icon> ➡️ </template>
                                    </Button>
                                </slot>
                            </div>
                        </Popover>
                        <slot v-if="$slots.suffix" name="suffix" />
                    </component>
                </div>
            </template>
        </widget-label>
    </div>
</template>
