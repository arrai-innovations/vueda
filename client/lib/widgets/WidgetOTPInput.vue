<script setup>
import InputOTP from "@vueda/controls/input-otp/InputOTP.vue";
import InputOTPGroup from "@vueda/controls/input-otp/InputOTPGroup.vue";
import InputOTPSlot from "@vueda/controls/input-otp/InputOTPSlot.vue";
import { WIDGET_EMITS, WIDGET_PROPS, useWidget } from "@vueda/use/useWidget.js";
import { FieldContextSymbol } from "@vueda/utils/symbols.js";
import { inject } from "vue";

/**
 * A one-time code widget that renders an InputOTP with form field integration.
 * Used for verification codes when paired with FormField. Renders one slot per character
 * unless the default slot supplies its own groups and slots.
 */
defineOptions({
    inheritAttrs: false,
});
const props = defineProps({
    ...WIDGET_PROPS,
    /** The number of characters in the code. */
    maxlength: { type: Number, default: 6 },
});
const emit = defineEmits([...WIDGET_EMITS]);
/** @type {import('@vueda/use/useField.js').FieldContext|null} */
const fieldContext = inject(FieldContextSymbol, null);
const widgetContext = useWidget(props, emit);
</script>
<template>
    <InputOTP
        :id="fieldContext?.state.fieldId"
        :model-value="widgetContext.state.combinedValue ?? ''"
        :maxlength="maxlength"
        :disabled="widgetContext.state.disabled"
        :aria-invalid="widgetContext.state.validationState.invalid || undefined"
        :data-warning="widgetContext.state.validationState.warning || undefined"
        :aria-required="widgetContext.state.required || undefined"
        :name="widgetContext.state.combinedName"
        data-qa="widget-otp-input"
        v-bind="$attrs"
        @update:model-value="widgetContext.state.combinedValue = $event"
        @blur="widgetContext.blur"
        @focus="widgetContext.focus"
    >
        <template #default="slotProps">
            <!-- @slot Override the character slots; receives vue-input-otp's slot props. -->
            <slot v-bind="slotProps">
                <InputOTPGroup>
                    <InputOTPSlot v-for="i in maxlength" :key="i" :index="i - 1" />
                </InputOTPGroup>
            </slot>
        </template>
    </InputOTP>
</template>
